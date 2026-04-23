from django.contrib import admin

from .models import DailyGoal, FoodLog, MealRecommendation


@admin.register(MealRecommendation)
class MealRecommendationAdmin(admin.ModelAdmin):
    list_display = (
        "activity_log",
        "calories_target",
        "protein_target_g",
        "carbs_target_g",
        "fat_target_g",
        "generated_at",
    )


@admin.register(FoodLog)
class FoodLogAdmin(admin.ModelAdmin):
    list_display = ("user", "food_name", "nutrition_source", "meal_type", "quantity_g", "logged_at")
    list_filter = ("meal_type", "nutrition_source", "logged_at")
    search_fields = ("food_name", "open_food_facts_id", "source_item_id", "user__username")


@admin.register(DailyGoal)
class DailyGoalAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "calories_goal", "protein_goal_g", "carbs_goal_g", "fat_goal_g")
    list_filter = ("date",)
    search_fields = ("user__username",)
