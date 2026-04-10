from decimal import Decimal

import pytest

from apps.activities.services import (
    calculate_bmr,
    calculate_net_calories_burned,
    calculate_tdee,
)
from apps.nutrition.services import calculate_post_workout_macros
from apps.users.services import calculate_daily_goal


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


def test_calculate_net_calories_burned_uses_met_correction():
    assert calculate_net_calories_burned(Decimal("8.0"), Decimal("70"), 60) == Decimal("490.00")


def test_net_calories_without_correction_differs_by_about_ten_to_fifteen_percent():
    gross_calories = Decimal("8.0") * Decimal("70") * (Decimal("60") / Decimal("60"))
    net_calories = calculate_net_calories_burned(Decimal("8.0"), Decimal("70"), 60)

    overcount_percentage = float(((gross_calories - net_calories) / gross_calories) * Decimal("100"))

    assert 10 <= overcount_percentage <= 15


@pytest.mark.parametrize("goal", ["lose", "maintain", "gain"])
@pytest.mark.parametrize("activity_category", ["strength", "cardio", "flexibility", "sport"])
def test_post_workout_macros_for_each_goal_and_activity_category(goal, activity_category):
    protein_multipliers = {
        "lose": {"strength": 2.2, "cardio": 1.8, "flexibility": 1.4, "sport": 2.0},
        "maintain": {"strength": 1.8, "cardio": 1.4, "flexibility": 1.2, "sport": 1.6},
        "gain": {"strength": 2.4, "cardio": 1.6, "flexibility": 1.4, "sport": 2.2},
    }
    carb_multipliers = {
        "lose": {"strength": 0.8, "cardio": 1.0, "flexibility": 0.5, "sport": 1.0},
        "maintain": {"strength": 1.2, "cardio": 1.4, "flexibility": 0.8, "sport": 1.3},
        "gain": {"strength": 1.5, "cardio": 1.6, "flexibility": 1.0, "sport": 1.5},
    }
    fat_targets = {"lose": 5.0, "maintain": 10.0, "gain": 12.0}

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
        ("maintain", Decimal("2500.0")),
        ("gain", Decimal("2800.0")),
    ],
)
def test_daily_goal_adjustment_for_each_goal_type(goal, expected):
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
