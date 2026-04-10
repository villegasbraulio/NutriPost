from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.response import Response

from apps.activities.services import calculate_bmr, calculate_tdee

from .models import User


def quantize(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_daily_goal(tdee, goal) -> Decimal:
    """
    Apply a moderate calorie adjustment to TDEE based on the selected body-composition goal.

    Formula:
    - lose = TDEE - 500 kcal
    - maintain = TDEE
    - gain = TDEE + 300 kcal
    """

    adjustments = {
        User.Goal.LOSE: Decimal("-500"),
        User.Goal.MAINTAIN: Decimal("0"),
        User.Goal.GAIN: Decimal("300"),
    }
    return (Decimal(str(tdee)) + adjustments[goal]).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def calculate_daily_macro_targets(user: User, daily_goal_calories: Decimal) -> dict[str, float]:
    """
    Build daily macro goals with weight-based protein and fat anchors plus carbohydrate fill.

    Formula:
    - protein_goal = 1.8 g/kg body weight
    - fat_goal = 0.8 g/kg body weight
    - carbs_goal = remaining calories ÷ 4 after protein and fat calories
    """

    protein_goal = Decimal(str(user.weight_kg)) * Decimal("1.8")
    fat_goal = Decimal(str(user.weight_kg)) * Decimal("0.8")
    carbs_goal = max(
        (daily_goal_calories - (protein_goal * Decimal("4")) - (fat_goal * Decimal("9")))
        / Decimal("4"),
        Decimal("0"),
    )
    return {
        "protein_goal_g": float(quantize(protein_goal)),
        "carbs_goal_g": float(quantize(carbs_goal)),
        "fat_goal_g": float(quantize(fat_goal)),
    }


def calculate_daily_goal_targets(user: User) -> dict[str, float]:
    """
    Estimate user-facing daily targets from the corrected BMR, TDEE, and calorie-goal equations.

    Formulae:
    - BMR = Mifflin-St Jeor
    - TDEE = BMR × activity multiplier
    - daily_goal_calories = TDEE adjusted by goal
    - daily macros = weight-based protein/fat anchors with carbohydrate fill
    """

    bmr = calculate_bmr(user.weight_kg, user.height_cm, user.age, user.gender)
    tdee = calculate_tdee(bmr, user.activity_level)
    daily_goal_calories = calculate_daily_goal(tdee, user.goal)
    macro_targets = calculate_daily_macro_targets(user, daily_goal_calories)
    return {
        "daily_goal_calories": float(daily_goal_calories),
        "calories_goal": float(daily_goal_calories),
        "protein_goal_g": macro_targets["protein_goal_g"],
        "carbs_goal_g": macro_targets["carbs_goal_g"],
        "fat_goal_g": macro_targets["fat_goal_g"],
        "tdee": float(tdee),
        "bmr": float(bmr),
    }


def sync_daily_goal(user: User, target_date: date):
    """Persist a DailyGoal row using the latest TDEE-derived calorie and macro targets."""
    from apps.nutrition.models import DailyGoal

    targets = calculate_daily_goal_targets(user)
    defaults = {
        "calories_goal": Decimal(str(targets["daily_goal_calories"])),
        "protein_goal_g": Decimal(str(targets["protein_goal_g"])),
        "carbs_goal_g": Decimal(str(targets["carbs_goal_g"])),
        "fat_goal_g": Decimal(str(targets["fat_goal_g"])),
    }

    try:
        with transaction.atomic():
            daily_goal, _ = DailyGoal.objects.update_or_create(
                user=user,
                date=target_date,
                defaults=defaults,
            )
            return daily_goal
    except IntegrityError:
        DailyGoal.objects.filter(user=user, date=target_date).update(**defaults)
        return DailyGoal.objects.get(user=user, date=target_date)


def sync_current_week_daily_goals(user: User, reference_date: date | None = None) -> None:
    """Update or create DailyGoal rows for each day of the current calendar week after profile changes."""

    current_date = reference_date or timezone.localdate()
    week_start = current_date - timedelta(days=current_date.weekday())
    for offset in range(7):
        sync_daily_goal(user, week_start + timedelta(days=offset))


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Store JWT access and refresh tokens in httpOnly cookies for browser-based auth."""
    cookie_settings = settings.SIMPLE_JWT
    response.set_cookie(
        cookie_settings["AUTH_COOKIE_ACCESS"],
        access_token,
        max_age=int(cookie_settings["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        httponly=cookie_settings["AUTH_COOKIE_HTTP_ONLY"],
        secure=cookie_settings["AUTH_COOKIE_SECURE"],
        samesite=cookie_settings["AUTH_COOKIE_SAMESITE"],
        path=cookie_settings["AUTH_COOKIE_PATH"],
    )
    response.set_cookie(
        cookie_settings["AUTH_COOKIE_REFRESH"],
        refresh_token,
        max_age=int(cookie_settings["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=cookie_settings["AUTH_COOKIE_HTTP_ONLY"],
        secure=cookie_settings["AUTH_COOKIE_SECURE"],
        samesite=cookie_settings["AUTH_COOKIE_SAMESITE"],
        path=cookie_settings["AUTH_COOKIE_PATH"],
    )


def clear_auth_cookies(response: Response) -> None:
    """Clear JWT cookies from the client on logout or refresh failure."""
    cookie_settings = settings.SIMPLE_JWT
    response.delete_cookie(cookie_settings["AUTH_COOKIE_ACCESS"], path=cookie_settings["AUTH_COOKIE_PATH"])
    response.delete_cookie(cookie_settings["AUTH_COOKIE_REFRESH"], path=cookie_settings["AUTH_COOKIE_PATH"])
