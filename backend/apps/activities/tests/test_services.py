from decimal import Decimal
from types import SimpleNamespace

import pytest

from apps.activities.services import (
    calculate_bmr,
    calculate_exercise_time_seconds,
    calculate_local_routine_met,
    calculate_net_calories_burned,
    calculate_routine_calorie_breakdown,
    estimate_exercise_met,
    calculate_tdee,
)
from apps.nutrition.services import calculate_post_workout_macros
from apps.users.services import calculate_daily_goal, calculate_daily_goal_targets


def test_calculate_bmr_for_male_known_input():
    assert calculate_bmr(70, 175, 30, "male") == Decimal("1648.75")


def test_calculate_bmr_for_female_known_input():
    assert calculate_bmr(70, 175, 30, "female") == Decimal("1482.75")


@pytest.mark.parametrize(
    ("activity_level", "expected"),
    [
        ("sedentary", Decimal("1920.00")),
        ("light", Decimal("2200.00")),
        ("moderate", Decimal("2480.00")),
        ("active", Decimal("2760.00")),
        ("very_active", Decimal("3040.00")),
    ],
)
def test_calculate_tdee_for_each_activity_level(activity_level, expected):
    assert calculate_tdee(Decimal("1600"), activity_level) == expected


def test_daily_targets_return_bmr_tdee_and_goal_calories_for_realistic_profile():
    user = SimpleNamespace(
        weight_kg=Decimal("79"),
        height_cm=Decimal("181"),
        age=29,
        gender="male",
        activity_level="moderate",
        goal="lose",
    )

    targets = calculate_daily_goal_targets(user)

    assert targets["bmr"] == pytest.approx(1781.25)
    assert targets["tdee"] == pytest.approx(2760.94)
    assert targets["calorias_objetivo"] == pytest.approx(2260.9)
    assert targets["goal_adjustment_calories"] == pytest.approx(-500)


def test_calculate_net_calories_burned_uses_met_correction():
    assert calculate_net_calories_burned(Decimal("8.0"), Decimal("70"), 60) == Decimal("490.00")


def test_net_calories_without_correction_differs_by_about_ten_to_fifteen_percent():
    gross_calories = Decimal("8.0") * Decimal("70") * (Decimal("60") / Decimal("60"))
    net_calories = calculate_net_calories_burned(Decimal("8.0"), Decimal("70"), 60)

    overcount_percentage = float(((gross_calories - net_calories) / gross_calories) * Decimal("100"))

    assert 10 <= overcount_percentage <= 15


@pytest.mark.parametrize("goal", ["lose", "reduce_fat", "maintain", "gain"])
@pytest.mark.parametrize("activity_category", ["strength", "cardio", "flexibility", "sport"])
def test_post_workout_macros_for_each_goal_and_activity_category(goal, activity_category):
    protein_multipliers = {
        "lose": {"strength": 2.2, "cardio": 1.8, "flexibility": 1.4, "sport": 2.0},
        "reduce_fat": {"strength": 2.0, "cardio": 1.6, "flexibility": 1.3, "sport": 1.8},
        "maintain": {"strength": 1.8, "cardio": 1.4, "flexibility": 1.2, "sport": 1.6},
        "gain": {"strength": 2.4, "cardio": 1.6, "flexibility": 1.4, "sport": 2.2},
    }
    carb_multipliers = {
        "lose": {"strength": 0.8, "cardio": 1.0, "flexibility": 0.5, "sport": 1.0},
        "reduce_fat": {"strength": 1.0, "cardio": 1.2, "flexibility": 0.7, "sport": 1.2},
        "maintain": {"strength": 1.2, "cardio": 1.4, "flexibility": 0.8, "sport": 1.3},
        "gain": {"strength": 1.5, "cardio": 1.6, "flexibility": 1.0, "sport": 1.5},
    }
    fat_targets = {"lose": 5.0, "reduce_fat": 8.0, "maintain": 10.0, "gain": 12.0}

    result = calculate_post_workout_macros(80, goal, activity_category, Decimal("500"))
    expected_protein = round(protein_multipliers[goal][activity_category] * 80, 1)
    expected_carbs = round(carb_multipliers[goal][activity_category] * 80, 1)
    expected_fat = fat_targets[goal]
    expected_total_calories = round(
        (expected_protein * 4) + (expected_carbs * 4) + (expected_fat * 9),
        1,
    )

    assert result["protein_g"] == pytest.approx(expected_protein)
    assert result["carbs_g"] == pytest.approx(expected_carbs)
    assert result["fat_g"] == pytest.approx(expected_fat)
    assert result["total_calories"] == pytest.approx(expected_total_calories)
    assert result["timing_window_minutes"] == 60
    assert "ISSN 2017" in result["notes"]


@pytest.mark.parametrize(
    ("goal", "expected"),
    [
        ("lose", Decimal("2000.0")),
        ("reduce_fat", Decimal("2200.0")),
        ("maintain", Decimal("2500.0")),
        ("gain", Decimal("2800.0")),
    ],
)
def test_daily_goal_uses_goal_adjustment(goal, expected):
    assert calculate_daily_goal(Decimal("2500"), goal) == expected


@pytest.mark.parametrize(
    ("met_value", "weight_kg", "duration_minutes", "expected"),
    [
        (Decimal("8.0"), Decimal("40"), 0, Decimal("0.00")),
        (Decimal("8.0"), Decimal("40"), 300, Decimal("1400.00")),
        (Decimal("8.0"), Decimal("150"), 60, Decimal("1050.00")),
        (Decimal("8.0"), Decimal("150"), 300, Decimal("5250.00")),
    ],
)
def test_net_calories_burned_edge_cases(met_value, weight_kg, duration_minutes, expected):
    assert calculate_net_calories_burned(met_value, weight_kg, duration_minutes) == expected


def test_local_routine_met_varies_by_volume_density_and_exercise_type():
    light_isolation = [
        {
            "name": "Biceps Curl",
            "sets": 3,
            "reps": 12,
            "weight_kg": 10,
            "rest_seconds": 180,
            "exercise_type": "isolation",
        }
    ]
    heavy_legs = [
        {
            "name": "Back Squat",
            "sets": 5,
            "reps": 5,
            "weight_kg": 120,
            "rest_seconds": 120,
            "exercise_type": "compound",
        },
        {
            "name": "Deadlift",
            "sets": 4,
            "reps": 6,
            "weight_kg": 140,
            "rest_seconds": 150,
            "exercise_type": "compound",
        },
    ]

    light_met = calculate_local_routine_met(light_isolation, user_weight_kg=70, duration_minutes=45)
    heavy_met = calculate_local_routine_met(heavy_legs, user_weight_kg=70, duration_minutes=45)

    assert light_met < heavy_met
    assert Decimal("3.50") <= light_met <= Decimal("4.50")
    assert heavy_met >= Decimal("5.00")


def test_routine_calories_use_exercise_time_met_and_seconds_per_hour():
    press = {
        "name": "Press plano",
        "sets": 3,
        "reps": 8,
        "weight_kg": 60,
        "seconds_per_rep": 3,
        "rest_seconds": 90,
        "exercise_type": "compound",
        "met_value": 6,
    }

    timing = calculate_exercise_time_seconds(press)
    breakdown = calculate_routine_calorie_breakdown([press], user_weight_kg=75)[0]

    assert timing["execution_seconds"] == Decimal("72.0")
    assert timing["pause_seconds"] == Decimal("180")
    assert timing["total_seconds"] == Decimal("252.0")
    assert breakdown["met_value"] == pytest.approx(6.0)
    assert breakdown["calories"] == pytest.approx(31.5)


def test_external_exercise_weight_does_not_change_formula_met_or_calories():
    base = {
        "name": "Press plano",
        "sets": 3,
        "reps": 10,
        "seconds_per_rep": 3,
        "rest_seconds": 90,
        "exercise_type": "compound",
    }
    empty_bar = {**base, "weight_kg": 20}
    heavy_bar = {**base, "weight_kg": 140}

    assert estimate_exercise_met(empty_bar, user_weight_kg=75) == estimate_exercise_met(heavy_bar, user_weight_kg=75)
    assert calculate_routine_calorie_breakdown([empty_bar], 75)[0]["calories"] == pytest.approx(
        calculate_routine_calorie_breakdown([heavy_bar], 75)[0]["calories"]
    )


def test_bodyweight_exercises_are_labeled_and_counted_without_external_load():
    breakdown = calculate_routine_calorie_breakdown(
        [
            {
                "name": "Side Plank",
                "sets": 5,
                "reps": 1,
                "seconds_per_rep": 30,
                "rest_seconds": 45,
                "exercise_type": "isolation",
            }
        ],
        user_weight_kg=75,
    )[0]

    assert breakdown["uses_bodyweight"] is True
    assert breakdown["load_label"] == "Bodyweight"
    assert breakdown["met_value"] >= 3.5
    assert breakdown["calories"] > 0
