from collections import defaultdict
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from apps.activities.models import ActivityLog
from apps.core.ai_client import GroqServiceError, get_model
from apps.nutrition.models import FoodLog
from apps.nutrition.serializers import DailyGoalSerializer
from apps.nutrition.services import ensure_daily_goal
from apps.users.services import calculate_daily_goal_targets

from .models import WeeklyInsight

INSIGHT_CACHE_HOURS = 23
INSIGHT_MIN_ACTIVITY_DAYS = 3


def get_period_days(period: str) -> int:
    mapping = {"7d": 7, "14d": 14, "30d": 30}
    return mapping.get(period, 7)


def get_date_range(period: str) -> tuple[date, date]:
    """Return inclusive local dates for a dashboard period."""

    days = get_period_days(period)
    today = timezone.localdate()
    return today - timedelta(days=days - 1), today


def get_local_datetime_range(start_date: date, end_date: date) -> tuple[datetime, datetime]:
    """Convert inclusive local dates into timezone-aware datetime bounds for DB filtering."""

    current_timezone = timezone.get_current_timezone()
    start_at = timezone.make_aware(datetime.combine(start_date, time.min), current_timezone)
    end_at = timezone.make_aware(datetime.combine(end_date + timedelta(days=1), time.min), current_timezone)
    return start_at, end_at


def get_local_date(value) -> date:
    """Return the local calendar date for a stored aware datetime."""

    return timezone.localtime(value).date()


def empty_day_payload(current_date: date) -> dict:
    """Build the stable dashboard shape for a single local day."""

    return {
        "date": current_date.isoformat(),
        "calories_burned": Decimal("0"),
        "calories_consumed": Decimal("0"),
        "protein_g": Decimal("0"),
        "carbs_g": Decimal("0"),
        "fat_g": Decimal("0"),
    }


def decimal_to_float(value):
    """Serialize Decimal values without leaking Decimal objects into API payloads."""

    return float(value) if isinstance(value, Decimal) else value


def build_summary(user, period: str) -> dict:
    """Aggregate period and today dashboard totals using local-date boundaries."""

    start_date, today = get_date_range(period)
    start_at, end_at = get_local_datetime_range(start_date, today)
    today_start_at, tomorrow_start_at = get_local_datetime_range(today, today)

    activity_logs = ActivityLog.objects.filter(user=user, logged_at__gte=start_at, logged_at__lt=end_at)
    food_logs = FoodLog.objects.filter(user=user, logged_at__gte=start_at, logged_at__lt=end_at)
    today_activity_logs = activity_logs.filter(logged_at__gte=today_start_at, logged_at__lt=tomorrow_start_at)
    today_food_logs = food_logs.filter(logged_at__gte=today_start_at, logged_at__lt=tomorrow_start_at)

    activity_totals = activity_logs.aggregate(calories_burned=Sum("calories_burned"))
    food_totals = food_logs.aggregate(
        calories_consumed=Sum("calories"),
        protein_g=Sum("protein_g"),
        carbs_g=Sum("carbs_g"),
        fat_g=Sum("fat_g"),
    )
    today_activity_totals = today_activity_logs.aggregate(calories_burned=Sum("calories_burned"))
    today_food_totals = today_food_logs.aggregate(
        calories_consumed=Sum("calories"),
        protein_g=Sum("protein_g"),
        carbs_g=Sum("carbs_g"),
        fat_g=Sum("fat_g"),
    )
    calories_burned = activity_totals["calories_burned"] or Decimal("0")
    calories_consumed = food_totals["calories_consumed"] or Decimal("0")
    protein_total = food_totals["protein_g"] or Decimal("0")
    carbs_total = food_totals["carbs_g"] or Decimal("0")
    fat_total = food_totals["fat_g"] or Decimal("0")
    today_calories_burned = today_activity_totals["calories_burned"] or Decimal("0")
    today_calories_consumed = today_food_totals["calories_consumed"] or Decimal("0")
    today_protein = today_food_totals["protein_g"] or Decimal("0")
    today_carbs = today_food_totals["carbs_g"] or Decimal("0")
    today_fat = today_food_totals["fat_g"] or Decimal("0")

    today_goal = ensure_daily_goal(user, today)
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": today.isoformat(),
        "calories_burned": float(calories_burned),
        "calories_consumed": float(calories_consumed),
        "net_balance": float(calories_burned - calories_consumed),
        "macros": {
            "protein_g": float(protein_total),
            "carbs_g": float(carbs_total),
            "fat_g": float(fat_total),
        },
        "today_goal": DailyGoalSerializer(today_goal).data,
        "today": {
            "date": today.isoformat(),
            "calories_burned": float(today_calories_burned),
            "calories_consumed": float(today_calories_consumed),
            "net_balance": float(today_calories_burned - today_calories_consumed),
            "protein_g": float(today_protein),
            "carbs_g": float(today_carbs),
            "fat_g": float(today_fat),
        },
        "recent_activities": [
            {
                "id": log.id,
                "activity": log.activity_type.name,
                "category": log.activity_type.category,
                "duration_minutes": log.duration_minutes,
                "calories_burned": float(log.calories_burned),
                "logged_at": timezone.localtime(log.logged_at).isoformat(),
            }
            for log in activity_logs.select_related("activity_type").order_by("-logged_at")[:5]
        ],
    }


def build_streak(user) -> dict:
    """Count consecutive days ending today with at least one activity log."""

    logged_dates = [
        get_local_date(value)
        for value in ActivityLog.objects.filter(user=user).values_list("logged_at", flat=True)
    ]
    streak = 0
    cursor = timezone.localdate()
    logged_set = set(logged_dates)
    while cursor in logged_set:
        streak += 1
        cursor -= timedelta(days=1)
    return {"streak": streak}


def build_progress(user) -> dict:
    """Return a weekly view of goal progress comparing burn and intake against daily targets."""

    start_date, today = get_date_range("7d")
    start_at, end_at = get_local_datetime_range(start_date, today)
    activity_logs = ActivityLog.objects.filter(user=user, logged_at__gte=start_at, logged_at__lt=end_at)
    food_logs = FoodLog.objects.filter(user=user, logged_at__gte=start_at, logged_at__lt=end_at)

    daily = defaultdict(lambda: None)

    for log in activity_logs:
        key = get_local_date(log.logged_at)
        daily[key] = daily[key] or empty_day_payload(key)
        daily[key]["calories_burned"] += Decimal(log.calories_burned)

    for log in food_logs:
        key = get_local_date(log.logged_at)
        daily[key] = daily[key] or empty_day_payload(key)
        daily[key]["calories_consumed"] += Decimal(log.calories)
        daily[key]["protein_g"] += Decimal(log.protein_g)
        daily[key]["carbs_g"] += Decimal(log.carbs_g)
        daily[key]["fat_g"] += Decimal(log.fat_g)

    payload = []
    for offset in range(7):
        current_date = start_date + timedelta(days=offset)
        goal = ensure_daily_goal(user, current_date)
        item = daily[current_date] or empty_day_payload(current_date)
        item["date"] = current_date.isoformat()
        item["calories_goal"] = float(goal.calories_goal)
        item["protein_goal_g"] = float(goal.protein_goal_g)
        item["carbs_goal_g"] = float(goal.carbs_goal_g)
        item["fat_goal_g"] = float(goal.fat_goal_g)
        payload.append(
            {
                key: decimal_to_float(value)
                for key, value in item.items()
            }
        )
    return {"weekly_progress": payload}


def aggregate_daily_stats(activities, foods, period_start: date, period_end: date) -> list[dict]:
    """Aggregate activity burn and nutrition intake into day-by-day records for AI analysis."""

    daily = defaultdict(
        lambda: {
            "calories_burned": Decimal("0"),
            "calories_consumed": Decimal("0"),
            "protein_g": Decimal("0"),
        }
    )

    for activity in activities:
        current_date = get_local_date(activity.logged_at)
        daily[current_date]["calories_burned"] += Decimal(activity.calories_burned)

    for food in foods:
        current_date = get_local_date(food.logged_at)
        daily[current_date]["calories_consumed"] += Decimal(food.calories)
        daily[current_date]["protein_g"] += Decimal(food.protein_g)

    stats = []
    total_days = (period_end - period_start).days + 1
    for offset in range(total_days):
        current_date = period_start + timedelta(days=offset)
        day_values = daily[current_date]
        stats.append(
            {
                "date": current_date.isoformat(),
                "calories_burned": float(day_values["calories_burned"]),
                "calories_consumed": float(day_values["calories_consumed"]),
                "protein_g": float(day_values["protein_g"]),
            }
        )
    return stats


def format_daily_stats(daily_stats: list[dict]) -> str:
    """Format seven-day numeric summaries into an AI-friendly text block."""

    return "\n".join(
        (
            f"{item['date']}: "
            f"{round(item['calories_burned'], 1)} | "
            f"{round(item['calories_consumed'], 1)} | "
            f"{round(item['protein_g'], 1)}"
        )
        for item in daily_stats
    )


def resolve_language_label(language_hint: str | None) -> str:
    """Convert an HTTP language hint into a short instruction for the AI insight."""

    hint = (language_hint or "").lower()
    if hint.startswith("es"):
        return "Spanish"
    if hint.startswith("pt"):
        return "Portuguese"
    return "English"


def generate_weekly_insight(user, language_hint: str | None = None) -> str:
    """
    Analyze the last seven days of activity and nutrition data and return a coach-style insight.
    """

    period_end = timezone.localdate()
    period_start = period_end - timedelta(days=6)
    start_at, end_at = get_local_datetime_range(period_start, period_end)
    activities = ActivityLog.objects.filter(
        user=user,
        logged_at__gte=start_at,
        logged_at__lt=end_at,
    ).select_related("activity_type")
    foods = FoodLog.objects.filter(
        user=user,
        logged_at__gte=start_at,
        logged_at__lt=end_at,
    )
    daily_stats = aggregate_daily_stats(activities, foods, period_start, period_end)
    goal_targets = calculate_daily_goal_targets(user)
    response_language = resolve_language_label(language_hint)

    prompt = f"""
Analyze this user's last 7 days of nutrition and activity data and write
a short, personalized coach insight (3–4 sentences max).

User goal: {user.goal}
Weight: {user.weight_kg} kg
Daily calorie goal: {goal_targets['daily_goal_calories']} kcal

Daily breakdown (date: calories_burned | calories_consumed | protein_g):
{format_daily_stats(daily_stats)}

Write like a supportive coach. Highlight 1 positive pattern and 1 specific
actionable improvement. Be concrete, not generic.
Do not use bullet points — write in natural paragraph form.
Answer in {response_language}.
""".strip()

    model = get_model(temperature=0.5)
    response = model.generate_content(prompt)
    insight_text = getattr(response, "text", "").strip()
    if not insight_text:
        raise GroqServiceError("Groq returned an empty weekly insight.")
    return insight_text


def serialize_weekly_insight(insight: WeeklyInsight, *, cached: bool) -> dict:
    """Serialize a stored weekly insight for the dashboard card."""

    return {
        "available": True,
        "content": insight.content,
        "period_start": insight.period_start.isoformat(),
        "period_end": insight.period_end.isoformat(),
        "generated_at": timezone.localtime(insight.generated_at).isoformat(),
        "cached": cached,
    }


def get_weekly_insight(user, language_hint: str | None = None) -> dict:
    """Return a cached weekly insight when fresh, or generate a new one after the cache expires."""

    period_end = timezone.localdate()
    period_start = period_end - timedelta(days=6)
    start_at, end_at = get_local_datetime_range(period_start, period_end)

    activity_days = list(
        {
            get_local_date(value)
            for value in ActivityLog.objects.filter(
                user=user,
                logged_at__gte=start_at,
                logged_at__lt=end_at,
            ).values_list("logged_at", flat=True)
        }
    )
    if len(activity_days) < INSIGHT_MIN_ACTIVITY_DAYS:
        return {
            "available": False,
            "content": "",
            "message": "Log 3+ days of activity to unlock your insights",
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "generated_at": None,
            "cached": False,
        }

    latest_insight = (
        WeeklyInsight.objects.filter(
            user=user,
            period_start=period_start,
            period_end=period_end,
        )
        .order_by("-generated_at")
        .first()
    )

    if latest_insight and latest_insight.generated_at >= timezone.now() - timedelta(hours=INSIGHT_CACHE_HOURS):
        return serialize_weekly_insight(latest_insight, cached=True)

    content = generate_weekly_insight(user, language_hint=language_hint)

    if latest_insight:
        latest_insight.content = content
        latest_insight.generated_at = timezone.now()
        latest_insight.save(update_fields=["content", "generated_at"])
        return serialize_weekly_insight(latest_insight, cached=False)

    insight = WeeklyInsight.objects.create(
        user=user,
        content=content,
        period_start=period_start,
        period_end=period_end,
        generated_at=timezone.now(),
    )
    return serialize_weekly_insight(insight, cached=False)
