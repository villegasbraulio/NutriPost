from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from random import choice, randint, uniform

from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import ActivityLog, ActivityType

User = get_user_model()
TIMING_WINDOW_MINUTES = 60
ACTIVITY_LEVEL_MULTIPLIERS = {
    "sedentary": Decimal("1.2"),
    "light": Decimal("1.375"),
    "moderate": Decimal("1.55"),
    "active": Decimal("1.725"),
    "very_active": Decimal("1.9"),
}

ACTIVITY_SEED_DATA = [
    {"name": "Running", "met_value": Decimal("8.0"), "category": "cardio", "icon_name": "running"},
    {"name": "Walking", "met_value": Decimal("3.5"), "category": "cardio", "icon_name": "footprints"},
    {"name": "Cycling", "met_value": Decimal("6.0"), "category": "cardio", "icon_name": "bike"},
    {"name": "Swimming", "met_value": Decimal("6.0"), "category": "cardio", "icon_name": "waves"},
    {"name": "HIIT", "met_value": Decimal("8.0"), "category": "cardio", "icon_name": "zap"},
    {"name": "Weight Training", "met_value": Decimal("3.5"), "category": "strength", "icon_name": "dumbbell"},
    {"name": "Yoga", "met_value": Decimal("2.5"), "category": "flexibility", "icon_name": "flower-2"},
    {"name": "Football", "met_value": Decimal("7.0"), "category": "sport", "icon_name": "trophy"},
    {"name": "Basketball", "met_value": Decimal("6.5"), "category": "sport", "icon_name": "dribbble"},
    {"name": "Boxing", "met_value": Decimal("7.5"), "category": "sport", "icon_name": "shield"},
    {"name": "Jump Rope", "met_value": Decimal("10.0"), "category": "cardio", "icon_name": "activity"},
    {"name": "Rowing", "met_value": Decimal("7.0"), "category": "cardio", "icon_name": "sailboat"},
    {"name": "Pilates", "met_value": Decimal("3.0"), "category": "flexibility", "icon_name": "heart-pulse"},
    {"name": "Dancing", "met_value": Decimal("5.0"), "category": "cardio", "icon_name": "music-2"},
    {"name": "Rock Climbing", "met_value": Decimal("7.5"), "category": "sport", "icon_name": "mountain"},
    {"name": "Tennis", "met_value": Decimal("7.0"), "category": "sport", "icon_name": "circle-dot"},
    {"name": "Martial Arts", "met_value": Decimal("5.5"), "category": "sport", "icon_name": "shield-half"},
    {"name": "Hiking", "met_value": Decimal("6.0"), "category": "cardio", "icon_name": "mountain-snow"},
    {"name": "Elliptical", "met_value": Decimal("5.0"), "category": "cardio", "icon_name": "orbit"},
    {"name": "Stair Climbing", "met_value": Decimal("8.8"), "category": "cardio", "icon_name": "building-2"},
    {"name": "CrossFit", "met_value": Decimal("8.5"), "category": "strength", "icon_name": "dumbbell"},
    {"name": "Volleyball", "met_value": Decimal("4.0"), "category": "sport", "icon_name": "circle-dot"},
    {"name": "Rugby", "met_value": Decimal("8.3"), "category": "sport", "icon_name": "trophy"},
    {"name": "Badminton", "met_value": Decimal("5.5"), "category": "sport", "icon_name": "circle-dot"},
    {"name": "Skating", "met_value": Decimal("7.0"), "category": "sport", "icon_name": "snowflake"},
    {"name": "Skiing", "met_value": Decimal("7.0"), "category": "sport", "icon_name": "mountain-snow"},
    {"name": "Surfing", "met_value": Decimal("3.0"), "category": "sport", "icon_name": "waves-ladder"},
    {"name": "Kayaking", "met_value": Decimal("5.0"), "category": "sport", "icon_name": "sailboat"},
    {"name": "Table Tennis", "met_value": Decimal("4.0"), "category": "sport", "icon_name": "circle-dot"},
    {"name": "Circuit Training", "met_value": Decimal("8.0"), "category": "strength", "icon_name": "flame"},
    {"name": "Core Workout", "met_value": Decimal("4.0"), "category": "strength", "icon_name": "dumbbell"},
    {"name": "Stretching", "met_value": Decimal("2.3"), "category": "flexibility", "icon_name": "leaf"},
    {"name": "Jogging", "met_value": Decimal("7.0"), "category": "cardio", "icon_name": "running"},
    {"name": "Power Walking", "met_value": Decimal("4.3"), "category": "cardio", "icon_name": "footprints"},
]


def quantize(value: Decimal, precision: str = "0.01") -> Decimal:
    return Decimal(value).quantize(Decimal(precision), rounding=ROUND_HALF_UP)


def calculate_bmr(weight_kg, height_cm, age, gender) -> Decimal:
    """
    Calculate basal metabolic rate with the Mifflin-St Jeor equation.

    Formula:
    - base = (10 × weight_kg) + (6.25 × height_cm) - (5 × age)
    - male = base + 5
    - non-male = base - 161
    """

    weight = Decimal(str(weight_kg))
    height = Decimal(str(height_cm))
    age_value = Decimal(str(age))
    base = (Decimal("10") * weight) + (Decimal("6.25") * height) - (Decimal("5") * age_value)
    adjustment = Decimal("5") if gender == "male" else Decimal("-161")
    return quantize(base + adjustment)


def calculate_tdee(bmr, activity_level) -> Decimal:
    """
    Calculate total daily energy expenditure with Harris-Benedict activity multipliers.

    Formula:
    - TDEE = BMR × activity_multiplier
    """

    multiplier = ACTIVITY_LEVEL_MULTIPLIERS[activity_level]
    return quantize(Decimal(str(bmr)) * multiplier)


def calculate_net_calories_burned(met_value, weight_kg, duration_minutes) -> Decimal:
    """
    Calculate net exercise calories using the corrected MET formula.

    Formula:
    - net_kcal = (MET - 1) × weight_kg × (duration_minutes / 60)

    Subtracting 1 MET removes resting expenditure to avoid double-counting baseline calories.
    """

    duration_hours = Decimal(str(duration_minutes)) / Decimal("60")
    adjusted_met = max(Decimal(str(met_value)) - Decimal("1"), Decimal("0"))
    calories = adjusted_met * Decimal(str(weight_kg)) * duration_hours
    return quantize(calories)


def calculate_timing_expires_at(logged_at, timing_window_minutes: int = TIMING_WINDOW_MINUTES):
    """Calculate the recovery timing deadline as logged_at plus the anabolic window in minutes."""

    return logged_at + timedelta(minutes=timing_window_minutes)


def get_timing_window_metadata(logged_at, timing_window_minutes: int = TIMING_WINDOW_MINUTES) -> dict:
    """Build timing metadata for recovery nutrition using the activity timestamp and 60-minute window."""

    return {
        "timing_window_minutes": timing_window_minutes,
        "timing_expires_at": calculate_timing_expires_at(logged_at, timing_window_minutes),
    }


def seed_activity_types() -> list[ActivityType]:
    """Create or update the default set of activity types using official-style MET values."""
    created_items = []
    for payload in ACTIVITY_SEED_DATA:
        activity_type, _ = ActivityType.objects.update_or_create(
            name=payload["name"],
            defaults=payload,
        )
        created_items.append(activity_type)
    return created_items


def seed_demo_user_data(user: User, days: int = 30) -> None:
    """Generate portfolio-friendly activity logs and food logs for a demo experience."""
    from apps.nutrition.models import FoodLog
    from apps.nutrition.services import ensure_daily_goal, get_or_create_meal_recommendation

    activity_types = list(ActivityType.objects.all())
    if not activity_types:
        activity_types = seed_activity_types()

    FoodLog.objects.filter(user=user).delete()
    ActivityLog.objects.filter(user=user).delete()

    meal_types = ["breakfast", "lunch", "dinner", "snack", "post_workout"]
    food_templates = [
        {"food_name": "Greek Yogurt Bowl", "calories": 220, "protein_g": 18, "carbs_g": 22, "fat_g": 6},
        {"food_name": "Chicken Rice Plate", "calories": 430, "protein_g": 34, "carbs_g": 42, "fat_g": 10},
        {"food_name": "Banana Protein Smoothie", "calories": 310, "protein_g": 24, "carbs_g": 38, "fat_g": 5},
        {"food_name": "Oatmeal with Berries", "calories": 260, "protein_g": 10, "carbs_g": 44, "fat_g": 5},
    ]

    for offset in range(days):
        logged_at = timezone.now() - timedelta(days=offset, hours=randint(0, 12))
        activity_type = choice(activity_types)
        duration_minutes = randint(20, 75)
        activity_log = ActivityLog.objects.create(
            user=user,
            activity_type=activity_type,
            duration_minutes=duration_minutes,
            notes=f"Demo session focused on {activity_type.name.lower()} volume.",
            logged_at=logged_at,
        )
        ensure_daily_goal(user, logged_at.date())
        get_or_create_meal_recommendation(activity_log)

        for index in range(randint(2, 4)):
            template = choice(food_templates)
            quantity_g = Decimal(str(round(uniform(120, 280), 2)))
            ratio = quantity_g / Decimal("100")
            FoodLog.objects.create(
                user=user,
                food_name=template["food_name"],
                open_food_facts_id=f"demo-{offset}-{index}",
                calories=Decimal(str(template["calories"])) * ratio,
                protein_g=Decimal(str(template["protein_g"])) * ratio,
                carbs_g=Decimal(str(template["carbs_g"])) * ratio,
                fat_g=Decimal(str(template["fat_g"])) * ratio,
                quantity_g=quantity_g,
                meal_type=choice(meal_types),
                logged_at=logged_at + timedelta(hours=index + 1),
            )
