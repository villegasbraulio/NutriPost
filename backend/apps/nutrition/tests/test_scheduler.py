from datetime import timedelta
from decimal import Decimal
from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone

from apps.activities.models import ActivityLog, ActivityType
from apps.nutrition.models import PostWorkoutWorkflow
from apps.nutrition.services import get_or_create_meal_recommendation


@pytest.fixture
def scheduler_user():
    User = get_user_model()
    return User.objects.create_user(
        username="scheduler-user",
        password="testpass123",
        weight_kg=Decimal("80"),
        height_cm=Decimal("180"),
        age=31,
        gender="male",
        activity_level="moderate",
        goal="maintain",
    )


@pytest.fixture
def cardio_type():
    return ActivityType.objects.create(
        name="Scheduler Cardio",
        met_value=Decimal("7.5"),
        category="cardio",
        icon_name="running",
    )


@pytest.fixture
def stub_scheduler_catalog(monkeypatch):
    def fake_search(query, preference="balanced", limit=8):
        return [
            {
                "id": f"{query}-1",
                "name": f"{query.title()} Option",
                "brand": "Scheduler Pantry",
                "image_url": "",
                "calories_per_100g": 150,
                "protein_g": 12.0,
                "carbs_g": 24.0,
                "fat_g": 3.0,
            }
        ]

    monkeypatch.setattr("apps.nutrition.services.search_food_catalog", fake_search)


@pytest.mark.django_db
def test_run_scheduled_jobs_command_marks_due_workflows(
    scheduler_user,
    cardio_type,
    stub_scheduler_catalog,
):
    now = timezone.now()
    activity_log = ActivityLog.objects.create(
        user=scheduler_user,
        activity_type=cardio_type,
        duration_minutes=35,
        logged_at=now - timedelta(minutes=30),
    )
    get_or_create_meal_recommendation(activity_log)

    workflow = activity_log.post_workout_workflow
    workflow.status = PostWorkoutWorkflow.Status.PENDING
    workflow.reminder_due_at = now - timedelta(minutes=1)
    workflow.reminder_triggered_at = None
    workflow.reminder_message = ""
    workflow.save(
        update_fields=[
            "status",
            "reminder_due_at",
            "reminder_triggered_at",
            "reminder_message",
            "updated_at",
        ]
    )

    stdout = StringIO()
    call_command("run_scheduled_jobs", stdout=stdout)

    workflow.refresh_from_db()
    output = stdout.getvalue()

    assert workflow.status == PostWorkoutWorkflow.Status.REMINDER_DUE
    assert "processed=1" in output
    assert "post_workout_workflows" in output
