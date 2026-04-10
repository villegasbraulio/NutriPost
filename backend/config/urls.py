from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.activities.views import ActivityLogViewSet, ActivityTypeViewSet
from apps.dashboard.views import DashboardViewSet
from apps.nutrition.views import FoodLogViewSet, FoodSearchViewSet, MealRecommendationViewSet
from apps.users.views import AuthViewSet

router = DefaultRouter()
router.register("auth", AuthViewSet, basename="auth")
router.register("activities/types", ActivityTypeViewSet, basename="activity-types")
router.register("activities/logs", ActivityLogViewSet, basename="activity-logs")
router.register(
    "nutrition/recommendations",
    MealRecommendationViewSet,
    basename="nutrition-recommendations",
)
router.register("nutrition/foods", FoodSearchViewSet, basename="nutrition-foods")
router.register("nutrition/food-logs", FoodLogViewSet, basename="food-logs")
router.register("dashboard", DashboardViewSet, basename="dashboard")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(router.urls)),
]
