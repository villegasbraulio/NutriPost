from rest_framework import serializers
from django.utils import timezone

from apps.activities.services import TIMING_WINDOW_MINUTES, calculate_timing_expires_at
from .models import DailyGoal, FoodLog, MealRecommendation
from .services import POST_WORKOUT_NOTES


class MealRecommendationSerializer(serializers.ModelSerializer):
    total_calories = serializers.DecimalField(source="calories_target", max_digits=8, decimal_places=2, read_only=True)
    timing_window_minutes = serializers.SerializerMethodField()
    timing_expires_at = serializers.SerializerMethodField()
    notes = serializers.SerializerMethodField()

    class Meta:
        model = MealRecommendation
        fields = (
            "id",
            "activity_log",
            "calories_target",
            "total_calories",
            "protein_target_g",
            "carbs_target_g",
            "fat_target_g",
            "recommended_foods",
            "timing_window_minutes",
            "timing_expires_at",
            "notes",
            "generated_at",
        )
        read_only_fields = fields

    def get_timing_window_minutes(self, obj: MealRecommendation):
        return TIMING_WINDOW_MINUTES

    def get_timing_expires_at(self, obj: MealRecommendation):
        return timezone.localtime(
            calculate_timing_expires_at(obj.activity_log.logged_at, TIMING_WINDOW_MINUTES)
        ).isoformat()

    def get_notes(self, obj: MealRecommendation):
        return POST_WORKOUT_NOTES


class FoodLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodLog
        fields = (
            "id",
            "food_name",
            "open_food_facts_id",
            "calories",
            "protein_g",
            "carbs_g",
            "fat_g",
            "quantity_g",
            "meal_type",
            "logged_at",
        )
        read_only_fields = ("id",)


class DailyGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyGoal
        fields = (
            "date",
            "calories_goal",
            "protein_goal_g",
            "carbs_goal_g",
            "fat_goal_g",
        )
