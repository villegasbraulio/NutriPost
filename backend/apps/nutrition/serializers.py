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
    nutrition_source_label = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = FoodLog
        fields = (
            "id",
            "food_name",
            "open_food_facts_id",
            "nutrition_source",
            "nutrition_source_label",
            "source_item_id",
            "source_metadata",
            "calories",
            "protein_g",
            "carbs_g",
            "fat_g",
            "quantity_g",
            "meal_type",
            "logged_at",
        )
        read_only_fields = ("id",)

    def validate(self, attrs):
        nutrition_source = attrs.get("nutrition_source") or FoodLog.NutritionSource.MANUAL
        source_metadata = attrs.get("source_metadata") or {}
        if not isinstance(source_metadata, dict):
            source_metadata = {}
        source_item_id = str(attrs.get("source_item_id") or attrs.get("open_food_facts_id") or "").strip()
        legacy_source_id = str(attrs.get("open_food_facts_id") or source_item_id).strip()
        if not legacy_source_id:
            fallback_reference = source_metadata.get("search_query") or attrs.get("food_name") or "food-log"
            legacy_source_id = f"{nutrition_source}:{fallback_reference}".strip()

        attrs["nutrition_source"] = nutrition_source
        attrs["source_item_id"] = source_item_id[:120]
        attrs["open_food_facts_id"] = legacy_source_id[:100]
        attrs["source_metadata"] = source_metadata
        return attrs

    def get_nutrition_source_label(self, obj: FoodLog) -> str:
        return obj.get_nutrition_source_display()


class ParseMealSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=2000, trim_whitespace=True)

    def validate_description(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Describe what you ate before parsing the meal.")
        return cleaned


class ParsedMealItemSerializer(serializers.Serializer):
    food_name = serializers.CharField()
    estimated_quantity_g = serializers.FloatField()
    calories = serializers.FloatField()
    protein_g = serializers.FloatField()
    carbs_g = serializers.FloatField()
    fat_g = serializers.FloatField()
    confidence = serializers.ChoiceField(choices=("high", "medium", "low"))
    food_type = serializers.ChoiceField(choices=("base_food", "packaged_product", "mixed_dish"))
    search_query = serializers.CharField()
    nutrition_source = serializers.ChoiceField(choices=FoodLog.NutritionSource.choices)
    nutrition_source_label = serializers.CharField()
    source_item_id = serializers.CharField(allow_blank=True)
    source_name = serializers.CharField(allow_blank=True)
    source_brand = serializers.CharField(allow_blank=True, required=False)
    match_confidence = serializers.ChoiceField(choices=("high", "medium", "low"))
    source_metadata = serializers.JSONField(required=False)


class ParsedMealResponseSerializer(serializers.Serializer):
    items = ParsedMealItemSerializer(many=True)
    total_calories = serializers.FloatField()
    total_protein_g = serializers.FloatField()
    total_carbs_g = serializers.FloatField()
    total_fat_g = serializers.FloatField()


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
