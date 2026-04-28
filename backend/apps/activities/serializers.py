from rest_framework import serializers
from django.utils import timezone

from .models import ActivityLog, ActivityType, GymRoutine
from .services import (
    TIMING_WINDOW_MINUTES,
    calculate_routine_calorie_summary,
    calculate_timing_expires_at,
    normalize_exercise_payload,
)


class ActivityTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityType
        fields = ("id", "name", "met_value", "category", "icon_name")


class GymRoutineSerializer(serializers.ModelSerializer):
    recent_activity_logs = serializers.SerializerMethodField()
    estimated_calories = serializers.SerializerMethodField()
    calculated_duration_minutes = serializers.SerializerMethodField()
    calorie_breakdown = serializers.SerializerMethodField()

    class Meta:
        model = GymRoutine
        fields = (
            "id",
            "name",
            "description",
            "exercises",
            "adjusted_met",
            "muscle_groups",
            "estimated_duration_minutes",
            "estimated_calories",
            "calculated_duration_minutes",
            "calorie_breakdown",
            "ai_analysis",
            "last_analyzed_at",
            "created_at",
            "updated_at",
            "recent_activity_logs",
        )
        read_only_fields = (
            "id",
            "adjusted_met",
            "estimated_calories",
            "calculated_duration_minutes",
            "calorie_breakdown",
            "ai_analysis",
            "last_analyzed_at",
            "created_at",
            "updated_at",
            "recent_activity_logs",
        )

    def validate_exercises(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Exercises must be a list.")
        if not value:
            raise serializers.ValidationError("Add at least one exercise.")
        if len(value) > 60:
            raise serializers.ValidationError("A routine can include up to 60 exercises.")
        normalized = [normalize_exercise_payload(item) for item in value if isinstance(item, dict)]
        if not normalized:
            raise serializers.ValidationError("Add at least one valid exercise.")
        return normalized

    def validate_muscle_groups(self, value):
        if value in (None, ""):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Muscle groups must be a list.")
        return [str(item).strip().lower() for item in value if str(item).strip()]

    def validate_estimated_duration_minutes(self, value):
        if value < 1:
            raise serializers.ValidationError("Duration must be at least 1 minute.")
        if value > 300:
            raise serializers.ValidationError("Duration cannot exceed 300 minutes.")
        return value

    def _get_calorie_summary(self, obj: GymRoutine):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return {"total_calories": 0, "calculated_duration_minutes": 0, "breakdown": []}

        cache = getattr(self, "_routine_calorie_summary_cache", {})
        cache_key = obj.pk or id(obj)
        if cache_key not in cache:
            cache[cache_key] = calculate_routine_calorie_summary(obj.exercises or [], request.user.weight_kg)
            self._routine_calorie_summary_cache = cache
        return cache[cache_key]

    def get_estimated_calories(self, obj: GymRoutine):
        return self._get_calorie_summary(obj)["total_calories"]

    def get_calculated_duration_minutes(self, obj: GymRoutine):
        return self._get_calorie_summary(obj)["calculated_duration_minutes"]

    def get_calorie_breakdown(self, obj: GymRoutine):
        return self._get_calorie_summary(obj)["breakdown"]

    def get_recent_activity_logs(self, obj: GymRoutine):
        if not self.context.get("include_routine_history"):
            return []

        return [
            {
                "id": activity_log.id,
                "duration_minutes": activity_log.duration_minutes,
                "calories_burned": float(activity_log.calories_burned),
                "logged_at": timezone.localtime(activity_log.logged_at).isoformat(),
                "activity_type": activity_log.activity_type.name,
            }
            for activity_log in obj.activity_logs.select_related("activity_type").order_by("-logged_at")[:8]
        ]


class RoutineParseTextSerializer(serializers.Serializer):
    raw_text = serializers.CharField()


class RoutineParseFileSerializer(serializers.Serializer):
    file = serializers.FileField()


class ActivityLogSerializer(serializers.ModelSerializer):
    activity_type = ActivityTypeSerializer(read_only=True)
    activity_type_id = serializers.PrimaryKeyRelatedField(
        queryset=ActivityType.objects.all(),
        source="activity_type",
        write_only=True,
    )
    gym_routine = GymRoutineSerializer(read_only=True)
    gym_routine_id = serializers.PrimaryKeyRelatedField(
        queryset=GymRoutine.objects.none(),
        source="gym_routine",
        write_only=True,
        required=False,
        allow_null=True,
    )
    recommendation = serializers.SerializerMethodField()
    post_workout_workflow = serializers.SerializerMethodField()
    timing_window_minutes = serializers.SerializerMethodField()
    timing_expires_at = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            self.fields["gym_routine_id"].queryset = GymRoutine.objects.filter(user=request.user)

    class Meta:
        model = ActivityLog
        fields = (
            "id",
            "activity_type",
            "activity_type_id",
            "gym_routine",
            "gym_routine_id",
            "duration_minutes",
            "calories_burned",
            "notes",
            "logged_at",
            "created_at",
            "timing_window_minutes",
            "timing_expires_at",
            "recommendation",
            "post_workout_workflow",
        )
        read_only_fields = (
            "id",
            "calories_burned",
            "created_at",
            "timing_window_minutes",
            "timing_expires_at",
            "recommendation",
            "post_workout_workflow",
        )

    def get_recommendation(self, obj: ActivityLog):
        if not self.context.get("include_recommendation"):
            return None

        from apps.nutrition.serializers import MealRecommendationSerializer
        from apps.nutrition.services import get_or_create_meal_recommendation

        recommendation_cache = self.context.get("recommendation_cache", {})
        recommendation = recommendation_cache.get(obj.pk) or get_or_create_meal_recommendation(obj)
        return MealRecommendationSerializer(recommendation).data

    def get_post_workout_workflow(self, obj: ActivityLog):
        from apps.nutrition.serializers import PostWorkoutWorkflowSerializer
        from apps.nutrition.services import sync_post_workout_workflow

        workflow = getattr(obj, "post_workout_workflow", None)
        if workflow is None:
            workflow = sync_post_workout_workflow(obj)
        return PostWorkoutWorkflowSerializer(workflow).data

    def get_timing_window_minutes(self, obj: ActivityLog):
        return TIMING_WINDOW_MINUTES

    def get_timing_expires_at(self, obj: ActivityLog):
        return timezone.localtime(
            calculate_timing_expires_at(obj.logged_at, TIMING_WINDOW_MINUTES)
        ).isoformat()
