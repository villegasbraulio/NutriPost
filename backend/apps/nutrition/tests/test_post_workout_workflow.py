from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.activities.models import ActivityLog, ActivityType
from apps.nutrition.models import FoodLog, PostWorkoutWorkflow
from apps.nutrition.services import (
    get_or_create_meal_recommendation,
    process_due_post_workout_workflows,
    sync_post_workout_workflows_for_food_log,
)


@pytest.fixture
def workflow_user():
    User = get_user_model()
    return User.objects.create_user(
        username="workflow-user",
        password="testpass123",
        weight_kg=Decimal("78"),
        height_cm=Decimal("178"),
        age=29,
        gender="male",
        activity_level="moderate",
        goal="maintain",
    )


@pytest.fixture
def strength_type():
    return ActivityType.objects.create(
        name="Strength Session",
        met_value=Decimal("6.0"),
        category="strength",
        icon_name="dumbbell",
    )


@pytest.fixture
def stub_food_catalog(monkeypatch):
    def fake_search(query, preference="balanced", limit=8):
        return [
            {
                "id": f"{query}-{index}",
                "name": f"{query.title()} Option {index}",
                "brand": "Test Pantry",
                "image_url": "",
                "calories_per_100g": 180 + index,
                "protein_g": 20.0 + index,
                "carbs_g": 18.0 + index,
                "fat_g": 4.0,
            }
            for index in range(1, min(limit, 3) + 1)
        ]

    monkeypatch.setattr("apps.nutrition.services.search_food_catalog", fake_search)


@pytest.mark.django_db
def test_meal_recommendation_creates_pending_workflow(workflow_user, strength_type, stub_food_catalog):
    activity_log = ActivityLog.objects.create(
        user=workflow_user,
        activity_type=strength_type,
        duration_minutes=50,
        logged_at=timezone.now(),
    )

    recommendation = get_or_create_meal_recommendation(activity_log)
    workflow = activity_log.post_workout_workflow

    assert recommendation.activity_log == activity_log
    assert workflow.user == workflow_user
    assert workflow.status == PostWorkoutWorkflow.Status.PENDING
    assert workflow.reminder_due_at == activity_log.logged_at + timedelta(minutes=60)
    assert workflow.completed_by_food_log is None
    assert workflow.reminder_message == ""


@pytest.mark.django_db
def test_food_log_inside_window_completes_workflow(workflow_user, strength_type, stub_food_catalog):
    logged_at = timezone.now() - timedelta(minutes=20)
    activity_log = ActivityLog.objects.create(
        user=workflow_user,
        activity_type=strength_type,
        duration_minutes=45,
        logged_at=logged_at,
    )
    get_or_create_meal_recommendation(activity_log)

    food_log = FoodLog.objects.create(
        user=workflow_user,
        food_name="Chicken and Rice",
        open_food_facts_id="chicken-rice",
        calories=Decimal("540"),
        protein_g=Decimal("42"),
        carbs_g=Decimal("58"),
        fat_g=Decimal("10"),
        quantity_g=Decimal("320"),
        meal_type=FoodLog.MealType.LUNCH,
        logged_at=logged_at + timedelta(minutes=30),
    )

    sync_post_workout_workflows_for_food_log(food_log)
    activity_log.refresh_from_db()
    workflow = activity_log.post_workout_workflow

    assert workflow.status == PostWorkoutWorkflow.Status.COMPLETED
    assert workflow.completed_by_food_log == food_log
    assert workflow.completed_at == food_log.logged_at
    assert workflow.reminder_message == ""


@pytest.mark.django_db
def test_due_workflow_becomes_reminder_due(workflow_user, strength_type, stub_food_catalog):
    now = timezone.now()
    activity_log = ActivityLog.objects.create(
        user=workflow_user,
        activity_type=strength_type,
        duration_minutes=55,
        logged_at=now - timedelta(minutes=20),
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

    processed = process_due_post_workout_workflows(now=now)
    activity_log.refresh_from_db()
    workflow = activity_log.post_workout_workflow

    assert len(processed) == 1
    assert workflow.status == PostWorkoutWorkflow.Status.REMINDER_DUE
    assert workflow.reminder_triggered_at == now
    assert "Suggested options" in workflow.reminder_message
    assert "strength session" in workflow.reminder_message.lower()


@pytest.mark.django_db
def test_post_workout_workflow_endpoint_lists_user_workflows(workflow_user, strength_type, stub_food_catalog):
    activity_log = ActivityLog.objects.create(
        user=workflow_user,
        activity_type=strength_type,
        duration_minutes=40,
        logged_at=timezone.now(),
    )
    get_or_create_meal_recommendation(activity_log)

    client = APIClient()
    client.force_authenticate(user=workflow_user)

    response = client.get("/api/v1/nutrition/post-workout-workflows/")

    assert response.status_code == 200
    assert len(response.data["results"]) == 1
    assert response.data["results"][0]["activity_log"] == activity_log.id
    assert response.data["results"][0]["status"] == PostWorkoutWorkflow.Status.PENDING
