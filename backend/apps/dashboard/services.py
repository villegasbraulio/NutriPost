from collections import defaultdict
from dataclasses import dataclass
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

from .models import DashboardNotification, WeeklyInsight

INSIGHT_CACHE_HOURS = 23
INSIGHT_MIN_ACTIVITY_DAYS = 3
SCHEDULED_INSIGHT_LANGUAGE_CODES = ("en", "es")
INSIGHT_NOTIFICATION_LANGUAGE_CODE = "en"


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
    unread_notifications_count = DashboardNotification.objects.filter(user=user, is_read=False).count()

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
        "unread_notifications_count": unread_notifications_count,
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


def resolve_language_code(language_hint: str | None) -> str:
    hint = (language_hint or "").lower()
    if hint.startswith("es"):
        return "es"
    if hint.startswith("pt"):
        return "pt"
    return "en"


def resolve_language_label(language_hint: str | None) -> str:
    """Convert a language code or hint into a short instruction for the AI insight."""

    language_code = resolve_language_code(language_hint)
    if language_code == "es":
        return "Spanish"
    if language_code == "pt":
        return "Portuguese"
    return "English"


def is_spanish_language_hint(language_hint: str | None) -> bool:
    return resolve_language_code(language_hint) == "es"


def has_minimum_activity_days(user, period_start: date, period_end: date) -> bool:
    start_at, end_at = get_local_datetime_range(period_start, period_end)
    activity_days = {
        get_local_date(value)
        for value in ActivityLog.objects.filter(
            user=user,
            logged_at__gte=start_at,
            logged_at__lt=end_at,
        ).values_list("logged_at", flat=True)
    }
    return len(activity_days) >= INSIGHT_MIN_ACTIVITY_DAYS


@dataclass
class ScheduledInsightSummary:
    processed: int = 0
    generated: int = 0
    cached: int = 0
    failed: int = 0
    skipped: int = 0
    notifications_synced: int = 0


def build_dashboard_notification_payload(workflow) -> dict:
    """Store stable, language-agnostic notification data for frontend rendering."""

    return {
        "activity_log_id": workflow.activity_log_id,
        "activity_name": workflow.activity_log.activity_type.name,
        "reminder_due_at": timezone.localtime(workflow.reminder_due_at).isoformat(),
    }


def build_weekly_insight_notification_payload(insight: WeeklyInsight) -> dict:
    return {
        "language": insight.language,
        "period_start": insight.period_start.isoformat(),
        "period_end": insight.period_end.isoformat(),
        "generated_at": timezone.localtime(insight.generated_at).isoformat(),
    }


def sync_dashboard_notification_for_workflow(workflow, *, now=None):
    """Keep the in-app dashboard notification aligned with the workflow status."""

    now = now or timezone.now()
    notification = getattr(workflow, "dashboard_notification", None)

    if workflow.status == workflow.Status.REMINDER_DUE:
        payload = build_dashboard_notification_payload(workflow)
        if notification is None:
            return DashboardNotification.objects.create(
                user=workflow.user,
                workflow=workflow,
                kind=DashboardNotification.Kind.POST_WORKOUT_REMINDER,
                payload=payload,
            )

        fields_to_update = []
        if notification.user_id != workflow.user_id:
            notification.user = workflow.user
            fields_to_update.append("user")
        if notification.kind != DashboardNotification.Kind.POST_WORKOUT_REMINDER:
            notification.kind = DashboardNotification.Kind.POST_WORKOUT_REMINDER
            fields_to_update.append("kind")
        if notification.payload != payload:
            notification.payload = payload
            fields_to_update.append("payload")
        if fields_to_update:
            notification.save(update_fields=[*fields_to_update, "updated_at"])
        return notification

    if notification is not None and not notification.is_read:
        notification.is_read = True
        notification.read_at = now
        notification.save(update_fields=["is_read", "read_at", "updated_at"])
    return notification


def sync_dashboard_notification_for_weekly_insight(
    insight: WeeklyInsight,
    *,
    now=None,
    mark_unread: bool = False,
):
    """Create or refresh the dashboard notification tied to a weekly insight."""

    now = now or timezone.now()
    notification = getattr(insight, "dashboard_notification", None)
    payload = build_weekly_insight_notification_payload(insight)

    if notification is None:
        return DashboardNotification.objects.create(
            user=insight.user,
            weekly_insight=insight,
            kind=DashboardNotification.Kind.WEEKLY_INSIGHT,
            payload=payload,
            is_read=not mark_unread,
            read_at=None if mark_unread else now,
        )

    fields_to_update = []
    if notification.user_id != insight.user_id:
        notification.user = insight.user
        fields_to_update.append("user")
    if notification.kind != DashboardNotification.Kind.WEEKLY_INSIGHT:
        notification.kind = DashboardNotification.Kind.WEEKLY_INSIGHT
        fields_to_update.append("kind")
    if notification.payload != payload:
        notification.payload = payload
        fields_to_update.append("payload")
    if mark_unread and notification.is_read:
        notification.is_read = False
        notification.read_at = None
        fields_to_update.extend(["is_read", "read_at"])

    if fields_to_update:
        notification.save(update_fields=[*fields_to_update, "updated_at"])
    return notification


def get_dashboard_notifications(user, unread_only: bool = False):
    queryset = (
        DashboardNotification.objects.filter(user=user)
        .select_related(
            "workflow",
            "workflow__activity_log",
            "workflow__activity_log__activity_type",
            "weekly_insight",
        )
        .order_by("is_read", "-created_at")
    )
    if unread_only:
        queryset = queryset.filter(is_read=False)
    return queryset


def mark_dashboard_notification_as_read(notification, *, now=None):
    if notification.is_read:
        return notification

    notification.is_read = True
    notification.read_at = now or timezone.now()
    notification.save(update_fields=["is_read", "read_at", "updated_at"])
    return notification


def get_latest_weekly_insight_record(user, period_start: date, period_end: date, language_code: str):
    return (
        WeeklyInsight.objects.filter(
            user=user,
            period_start=period_start,
            period_end=period_end,
            language=language_code,
        )
        .order_by("-generated_at")
        .first()
    )


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
        "language": insight.language,
        "period_start": insight.period_start.isoformat(),
        "period_end": insight.period_end.isoformat(),
        "generated_at": timezone.localtime(insight.generated_at).isoformat(),
        "cached": cached,
    }


def get_weekly_insight(user, language_hint: str | None = None) -> dict:
    """Return a cached weekly insight when fresh, or generate a new one after the cache expires."""

    language_code = resolve_language_code(language_hint)
    period_end = timezone.localdate()
    period_start = period_end - timedelta(days=6)
    if not has_minimum_activity_days(user, period_start, period_end):
        return {
            "available": False,
            "content": "",
            "message": "Log 3+ days of activity to unlock your insights",
            "language": language_code,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "generated_at": None,
            "cached": False,
        }

    latest_insight = get_latest_weekly_insight_record(user, period_start, period_end, language_code)

    if latest_insight and latest_insight.generated_at >= timezone.now() - timedelta(hours=INSIGHT_CACHE_HOURS):
        return serialize_weekly_insight(latest_insight, cached=True)

    content = generate_weekly_insight(user, language_hint=language_hint)

    if latest_insight:
        latest_insight.content = content
        latest_insight.generated_at = timezone.now()
        latest_insight.language = language_code
        latest_insight.save(update_fields=["content", "generated_at", "language"])
        return serialize_weekly_insight(latest_insight, cached=False)

    insight = WeeklyInsight.objects.create(
        user=user,
        content=content,
        period_start=period_start,
        period_end=period_end,
        language=language_code,
        generated_at=timezone.now(),
    )
    return serialize_weekly_insight(insight, cached=False)


def generate_scheduled_weekly_insights(*, now=None, user_limit: int | None = None) -> ScheduledInsightSummary:
    """Pre-generate fresh weekly insights so the dashboard can load them instantly."""

    now = now or timezone.now()
    period_end = timezone.localdate()
    period_start = period_end - timedelta(days=6)
    start_at, end_at = get_local_datetime_range(period_start, period_end)
    recent_logs = (
        ActivityLog.objects.filter(logged_at__gte=start_at, logged_at__lt=end_at)
        .select_related("user")
        .order_by("user_id", "-logged_at")
    )

    users_by_id = {}
    activity_days_by_user = defaultdict(set)
    for log in recent_logs:
        users_by_id[log.user_id] = log.user
        activity_days_by_user[log.user_id].add(get_local_date(log.logged_at))

    eligible_users = [
        users_by_id[user_id]
        for user_id, activity_days in activity_days_by_user.items()
        if len(activity_days) >= INSIGHT_MIN_ACTIVITY_DAYS
    ]
    eligible_users.sort(key=lambda user: user.id)
    if user_limit is not None:
        eligible_users = eligible_users[:user_limit]

    summary = ScheduledInsightSummary()
    stale_before = now - timedelta(hours=INSIGHT_CACHE_HOURS)

    for user in eligible_users:
        for language_code in SCHEDULED_INSIGHT_LANGUAGE_CODES:
            summary.processed += 1
            latest_insight = get_latest_weekly_insight_record(user, period_start, period_end, language_code)
            if latest_insight and latest_insight.generated_at >= stale_before:
                summary.cached += 1
                continue

            try:
                payload = get_weekly_insight(user, language_hint=language_code)
            except GroqServiceError:
                summary.failed += 1
                continue

            if not payload.get("available"):
                summary.skipped += 1
            elif payload.get("cached"):
                summary.cached += 1
            else:
                summary.generated += 1
                if language_code == INSIGHT_NOTIFICATION_LANGUAGE_CODE:
                    latest_insight = get_latest_weekly_insight_record(user, period_start, period_end, language_code)
                    if latest_insight is not None:
                        sync_dashboard_notification_for_weekly_insight(
                            latest_insight,
                            now=now,
                            mark_unread=True,
                        )
                        summary.notifications_synced += 1

    return summary
