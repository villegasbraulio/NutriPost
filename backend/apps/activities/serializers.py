from rest_framework import serializers
from django.utils import timezone

from .models import ActivityLog, ActivityType
from .services import TIMING_WINDOW_MINUTES, calculate_timing_expires_at


class ActivityTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityType
        fields = ("id", "name", "met_value", "category", "icon_name")


class ActivityLogSerializer(serializers.ModelSerializer):
    activity_type = ActivityTypeSerializer(read_only=True)
    activity_type_id = serializers.PrimaryKeyRelatedField(
        queryset=ActivityType.objects.all(),
        source="activity_type",
        write_only=True,
    )
    recommendation = serializers.SerializerMethodField()
    timing_window_minutes = serializers.SerializerMethodField()
    timing_expires_at = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = (
            "id",
            "activity_type",
            "activity_type_id",
            "duration_minutes",
            "calories_burned",
            "notes",
            "logged_at",
            "created_at",
            "timing_window_minutes",
            "timing_expires_at",
            "recommendation",
        )
        read_only_fields = (
            "id",
            "calories_burned",
            "created_at",
            "timing_window_minutes",
            "timing_expires_at",
            "recommendation",
        )

    def get_recommendation(self, obj: ActivityLog):
        if not self.context.get("include_recommendation"):
            return None

        from apps.nutrition.serializers import MealRecommendationSerializer
        from apps.nutrition.services import get_or_create_meal_recommendation

        recommendation_cache = self.context.get("recommendation_cache", {})
        recommendation = recommendation_cache.get(obj.pk) or get_or_create_meal_recommendation(obj)
        return MealRecommendationSerializer(recommendation).data

    def get_timing_window_minutes(self, obj: ActivityLog):
        return TIMING_WINDOW_MINUTES

    def get_timing_expires_at(self, obj: ActivityLog):
        return timezone.localtime(
            calculate_timing_expires_at(obj.logged_at, TIMING_WINDOW_MINUTES)
        ).isoformat()
