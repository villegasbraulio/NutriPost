from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.activities.views import ActivityLogViewSet, ActivityTypeViewSet, GymRoutineViewSet
from apps.assistant.views import AssistantViewSet
from apps.dashboard.views import DashboardNotificationViewSet, DashboardViewSet
from apps.nutrition.views import (
    FoodLogViewSet,
    FoodSearchViewSet,
    MealRecommendationViewSet,
    NutritionAIViewSet,
    PostWorkoutWorkflowViewSet,
)
from apps.users.views import AuthViewSet

router = DefaultRouter()
router.register("auth", AuthViewSet, basename="auth")
router.register("activities/types", ActivityTypeViewSet, basename="activity-types")
router.register("activities/logs", ActivityLogViewSet, basename="activity-logs")
router.register("routines", GymRoutineViewSet, basename="routines")
router.register("assistant", AssistantViewSet, basename="assistant")
router.register(
    "nutrition/recommendations",
    MealRecommendationViewSet,
    basename="nutrition-recommendations",
)
router.register("nutrition/foods", FoodSearchViewSet, basename="nutrition-foods")
router.register("nutrition/food-logs", FoodLogViewSet, basename="food-logs")
router.register("nutrition/post-workout-workflows", PostWorkoutWorkflowViewSet, basename="post-workout-workflows")
router.register("dashboard", DashboardViewSet, basename="dashboard")
router.register("dashboard/notifications", DashboardNotificationViewSet, basename="dashboard-notifications")


def health_check(_request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("admin/", admin.site.urls),
    path(
        "api/v1/nutrition/parse-meal/",
        NutritionAIViewSet.as_view({"post": "parse_meal"}),
        name="nutrition-parse-meal",
    ),
    path("api/v1/", include(router.urls)),
]
