from concurrent.futures import ThreadPoolExecutor
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model

from apps.nutrition.services import ensure_daily_goal
from apps.users.services import sync_daily_goal


@pytest.fixture
def goal_user(db):
    User = get_user_model()
    return User.objects.create_user(
        username="goal-user",
        password="testpass123",
        weight_kg=Decimal("79"),
        height_cm=Decimal("181"),
        age=29,
        gender="male",
        activity_level="moderate",
        goal="lose",
    )


@pytest.mark.django_db
def test_sync_daily_goal_persists_expected_targets(goal_user):
    daily_goal = sync_daily_goal(goal_user, date(2026, 4, 22))

    assert daily_goal.user == goal_user
    assert daily_goal.calories_goal > 0
    assert daily_goal.protein_goal_g > 0
    assert daily_goal.carbs_goal_g >= 0
    assert daily_goal.fat_goal_g > 0


@pytest.mark.django_db(transaction=True)
def test_ensure_daily_goal_survives_concurrent_requests(goal_user):
    target_date = date(2026, 4, 22)

    def worker():
        return ensure_daily_goal(goal_user, target_date).pk

    with ThreadPoolExecutor(max_workers=5) as executor:
        results = [future.result() for future in [executor.submit(worker) for _ in range(5)]]

    assert len(set(results)) == 1
