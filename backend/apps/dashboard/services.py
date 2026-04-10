from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from apps.activities.models import ActivityLog
from apps.nutrition.models import FoodLog
from apps.nutrition.serializers import DailyGoalSerializer
from apps.nutrition.services import ensure_daily_goal


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
    logged_dates = list(
        ActivityLog.objects.filter(user=user)
        .dates("logged_at", "day", order="DESC")
    )
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
