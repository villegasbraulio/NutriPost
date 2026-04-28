from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.activities.models import ActivityLog, ActivityType
from apps.dashboard.models import DashboardNotification
from apps.dashboard.services import generate_scheduled_weekly_insights
from apps.nutrition.models import FoodLog, PostWorkoutWorkflow
from apps.nutrition.services import get_or_create_meal_recommendation, sync_post_workout_workflows_for_food_log


@pytest.fixture
def notification_user():
    User = get_user_model()
    return User.objects.create_user(
        username="notification-user",
        password="testpass123",
        weight_kg=Decimal("76"),
        height_cm=Decimal("174"),
        age=28,
        gender="female",
        activity_level="moderate",
        goal="maintain",
    )


@pytest.fixture
def sport_type():
    return ActivityType.objects.create(
        name="Football Recovery",
        met_value=Decimal("7.0"),
        category="sport",
        icon_name="trophy",
    )


@pytest.fixture
def stub_notification_catalog(monkeypatch):
    def fake_search(query, preference="balanced", limit=8):
        return [
            {
                "id": f"{query}-1",
                "name": f"{query.title()} Option",
                "brand": "Recovery Pantry",
                "image_url": "",
                "calories_per_100g": 160,
                "protein_g": 11.0,
                "carbs_g": 22.0,
                "fat_g": 4.0,
            }
        ]

    monkeypatch.setattr("apps.nutrition.services.search_food_catalog", fake_search)


@pytest.mark.django_db
def test_due_workflow_creates_dashboard_notification(
    notification_user,
    sport_type,
    stub_notification_catalog,
):
    activity_log = ActivityLog.objects.create(
        user=notification_user,
        activity_type=sport_type,
        duration_minutes=60,
        logged_at=timezone.now() - timedelta(hours=2),
    )

    get_or_create_meal_recommendation(activity_log)
    workflow = activity_log.post_workout_workflow
    notification = workflow.dashboard_notification

    assert workflow.status == PostWorkoutWorkflow.Status.REMINDER_DUE
    assert notification.kind == DashboardNotification.Kind.POST_WORKOUT_REMINDER
    assert notification.is_read is False
    assert notification.payload["activity_log_id"] == activity_log.id


@pytest.mark.django_db
def test_completed_workflow_marks_notification_as_read(
    notification_user,
    sport_type,
    stub_notification_catalog,
):
    logged_at = timezone.now() - timedelta(hours=2)
    activity_log = ActivityLog.objects.create(
        user=notification_user,
        activity_type=sport_type,
        duration_minutes=55,
        logged_at=logged_at,
    )

    get_or_create_meal_recommendation(activity_log)
    workflow = activity_log.post_workout_workflow
    assert workflow.dashboard_notification.is_read is False

    food_log = FoodLog.objects.create(
        user=notification_user,
        food_name="Recovery Bowl",
        open_food_facts_id="recovery-bowl",
        calories=Decimal("500"),
        protein_g=Decimal("35"),
        carbs_g=Decimal("60"),
        fat_g=Decimal("12"),
        quantity_g=Decimal("300"),
        meal_type=FoodLog.MealType.POST_WORKOUT,
        logged_at=logged_at + timedelta(minutes=20),
    )

    sync_post_workout_workflows_for_food_log(food_log)
    workflow.refresh_from_db()
    notification = workflow.dashboard_notification

    assert workflow.status == PostWorkoutWorkflow.Status.COMPLETED
    assert notification.is_read is True
    assert notification.read_at is not None


@pytest.mark.django_db
def test_dashboard_notifications_endpoint_lists_and_dismisses(
    notification_user,
    sport_type,
    stub_notification_catalog,
):
    activity_log = ActivityLog.objects.create(
        user=notification_user,
        activity_type=sport_type,
        duration_minutes=50,
        logged_at=timezone.now() - timedelta(hours=2),
    )
    get_or_create_meal_recommendation(activity_log)
    notification = activity_log.post_workout_workflow.dashboard_notification

    client = APIClient()
    client.force_authenticate(user=notification_user)

    list_response = client.get("/api/v1/dashboard/notifications/", {"unread": "true"})
    dismiss_response = client.post(f"/api/v1/dashboard/notifications/{notification.id}/dismiss/")
    notification.refresh_from_db()

    assert list_response.status_code == 200
    assert list_response.data["count"] == 1
    assert list_response.data["results"][0]["activity_log_id"] == activity_log.id
    assert dismiss_response.status_code == 200
    assert notification.is_read is True


@pytest.mark.django_db
def test_scheduled_weekly_insight_creates_single_dashboard_notification(
    notification_user,
    sport_type,
    monkeypatch,
):
    for offset in range(3):
        ActivityLog.objects.create(
            user=notification_user,
            activity_type=sport_type,
            duration_minutes=45,
            logged_at=timezone.now() - timedelta(days=offset),
        )

    class DummyModel:
        @staticmethod
        def generate_content(prompt):
            return type(
                "Response",
                (),
                {"text": "Insight ES" if "Answer in Spanish." in prompt else "Insight EN"},
            )()

    monkeypatch.setattr("apps.dashboard.services.get_model", lambda temperature=0.5: DummyModel())

    summary = generate_scheduled_weekly_insights(now=timezone.now(), user_limit=1)
    notifications = DashboardNotification.objects.filter(user=notification_user, kind=DashboardNotification.Kind.WEEKLY_INSIGHT)

    assert summary.generated == 2
    assert summary.notifications_synced == 1
    assert notifications.count() == 1
    notification = notifications.first()
    assert notification.is_read is False
    assert notification.weekly_insight is not None
    assert notification.weekly_insight.language == "en"


@pytest.mark.django_db
def test_weekly_insight_notification_endpoint_payload(notification_user, sport_type, monkeypatch):
    for offset in range(3):
        ActivityLog.objects.create(
            user=notification_user,
            activity_type=sport_type,
            duration_minutes=35,
            logged_at=timezone.now() - timedelta(days=offset),
        )

    class DummyModel:
        @staticmethod
        def generate_content(prompt):
            return type(
                "Response",
                (),
                {"text": "Insight ES" if "Answer in Spanish." in prompt else "Insight EN"},
            )()

    monkeypatch.setattr("apps.dashboard.services.get_model", lambda temperature=0.5: DummyModel())
    generate_scheduled_weekly_insights(now=timezone.now(), user_limit=1)
    notification = DashboardNotification.objects.get(user=notification_user, kind=DashboardNotification.Kind.WEEKLY_INSIGHT)

    client = APIClient()
    client.force_authenticate(user=notification_user)
    response = client.get("/api/v1/dashboard/notifications/", {"unread": "true"})

    assert response.status_code == 200
    item = next(result for result in response.data["results"] if result["id"] == notification.id)
    assert item["kind"] == DashboardNotification.Kind.WEEKLY_INSIGHT
    assert item["action_url"] == "/dashboard#weekly-insight"
    assert item["action_label"] == "View insight"
