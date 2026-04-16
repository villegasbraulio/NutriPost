from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.activities.models import ActivityLog, ActivityType
from apps.dashboard.services import build_progress, build_summary
from apps.nutrition.models import FoodLog


@pytest.fixture
def dashboard_user():
    User = get_user_model()
    return User.objects.create_user(
        username="dashboard-user",
        password="testpass123",
        weight_kg=Decimal("70"),
        height_cm=Decimal("175"),
        age=30,
        gender="male",
        activity_level="moderate",
        goal="maintain",
    )


@pytest.fixture
def running_type():
    return ActivityType.objects.create(
        name="Running Test",
        met_value=Decimal("8.0"),
        category="cardio",
        icon_name="running",
    )


@pytest.mark.django_db
def test_summary_exposes_today_totals_and_recent_activity(dashboard_user, running_type):
    ActivityLog.objects.create(
        user=dashboard_user,
        activity_type=running_type,
        duration_minutes=60,
        logged_at=timezone.now(),
    )
    FoodLog.objects.create(
        user=dashboard_user,
        food_name="Rice bowl",
        open_food_facts_id="rice-bowl",
        calories=Decimal("600"),
        protein_g=Decimal("30"),
        carbs_g=Decimal("80"),
        fat_g=Decimal("12"),
        quantity_g=Decimal("350"),
        meal_type="lunch",
        logged_at=timezone.now(),
    )

    summary = build_summary(dashboard_user, "7d")

    assert summary["today"]["calories_burned"] == pytest.approx(490)
    assert summary["today"]["calories_consumed"] == pytest.approx(600)
    assert summary["today"]["protein_g"] == pytest.approx(30)
    assert summary["calories_burned"] == pytest.approx(490)
    assert summary["calories_consumed"] == pytest.approx(600)
    assert len(summary["recent_activities"]) == 1


@pytest.mark.django_db
def test_progress_returns_stable_seven_day_payload_with_today_last(dashboard_user, running_type):
    ActivityLog.objects.create(
        user=dashboard_user,
        activity_type=running_type,
        duration_minutes=30,
        logged_at=timezone.now(),
    )

    progress = build_progress(dashboard_user)["weekly_progress"]

    assert len(progress) == 7
    assert progress[-1]["date"] == timezone.localdate().isoformat()
    assert progress[-1]["calories_burned"] == pytest.approx(245)
    assert "calories_goal" in progress[-1]
