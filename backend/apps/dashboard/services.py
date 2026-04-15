from collections import defaultdict
from datetime import date, timedelta
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


def build_summary(user, period: str) -> dict:
    """Aggregate calories burned, consumed, and macro totals over a requested day window."""

    days = get_period_days(period)
    today = timezone.localdate()
    start_date = today - timedelta(days=days - 1)

    activity_logs = ActivityLog.objects.filter(user=user, logged_at__date__gte=start_date)
    food_logs = FoodLog.objects.filter(user=user, logged_at__date__gte=start_date)

    calories_burned = activity_logs.aggregate(total=Sum("calories_burned"))["total"] or Decimal("0")
    calories_consumed = food_logs.aggregate(total=Sum("calories"))["total"] or Decimal("0")
    protein_total = food_logs.aggregate(total=Sum("protein_g"))["total"] or Decimal("0")
    carbs_total = food_logs.aggregate(total=Sum("carbs_g"))["total"] or Decimal("0")
    fat_total = food_logs.aggregate(total=Sum("fat_g"))["total"] or Decimal("0")

    today_goal = ensure_daily_goal(user, today)
    return {
        "period": period,
        "calories_burned": float(calories_burned),
        "calories_consumed": float(calories_consumed),
        "net_balance": float(calories_burned - calories_consumed),
        "macros": {
            "protein_g": float(protein_total),
            "carbs_g": float(carbs_total),
            "fat_g": float(fat_total),
        },
        "today_goal": DailyGoalSerializer(today_goal).data,
        "recent_activities": [
            {
                "id": log.id,
                "activity": log.activity_type.name,
                "category": log.activity_type.category,
                "duration_minutes": log.duration_minutes,
                "calories_burned": float(log.calories_burned),
                "logged_at": log.logged_at.isoformat(),
            }
            for log in activity_logs.select_related("activity_type").order_by("-logged_at")[:5]
        ],
    }


def build_streak(user) -> dict:
    """Count consecutive days ending today with at least one activity log."""

    logged_dates = list(ActivityLog.objects.filter(user=user).dates("logged_at", "day", order="DESC"))
    streak = 0
    cursor = timezone.localdate()
    logged_set = set(logged_dates)
    while cursor in logged_set:
        streak += 1
        cursor -= timedelta(days=1)
    return {"streak": streak}


def build_progress(user) -> dict:
    """Return a weekly view of goal progress comparing burn and intake against daily targets."""

    today = timezone.localdate()
    start_date = today - timedelta(days=6)
    activity_logs = ActivityLog.objects.filter(user=user, logged_at__date__gte=start_date).select_related(
        "activity_type"
    )
    food_logs = FoodLog.objects.filter(user=user, logged_at__date__gte=start_date)

    daily = defaultdict(
        lambda: {
            "date": None,
            "calories_burned": Decimal("0"),
            "calories_consumed": Decimal("0"),
            "protein_g": Decimal("0"),
            "carbs_g": Decimal("0"),
            "fat_g": Decimal("0"),
        }
    )

    for log in activity_logs:
        key = log.logged_at.date()
        daily[key]["date"] = key.isoformat()
        daily[key]["calories_burned"] += Decimal(log.calories_burned)

    for log in food_logs:
        key = log.logged_at.date()
        daily[key]["date"] = key.isoformat()
        daily[key]["calories_consumed"] += Decimal(log.calories)
        daily[key]["protein_g"] += Decimal(log.protein_g)
        daily[key]["carbs_g"] += Decimal(log.carbs_g)
        daily[key]["fat_g"] += Decimal(log.fat_g)

    payload = []
    for offset in range(7):
        current_date = start_date + timedelta(days=offset)
        goal = ensure_daily_goal(user, current_date)
        item = daily[current_date]
        item["date"] = current_date.isoformat()
        item["calories_goal"] = float(goal.calories_goal)
        item["protein_goal_g"] = float(goal.protein_goal_g)
        item["carbs_goal_g"] = float(goal.carbs_goal_g)
        item["fat_goal_g"] = float(goal.fat_goal_g)
        payload.append(
            {
                key: float(value) if isinstance(value, Decimal) else value
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
        current_date = activity.logged_at.date()
        daily[current_date]["calories_burned"] += Decimal(activity.calories_burned)

    for food in foods:
        current_date = food.logged_at.date()
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
    activities = ActivityLog.objects.filter(
        user=user,
        logged_at__date__gte=period_start,
        logged_at__date__lte=period_end,
    ).select_related("activity_type")
    foods = FoodLog.objects.filter(
        user=user,
        logged_at__date__gte=period_start,
        logged_at__date__lte=period_end,
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

    activity_days = list(
        ActivityLog.objects.filter(
            user=user,
            logged_at__date__gte=period_start,
            logged_at__date__lte=period_end,
        ).dates("logged_at", "day")
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
