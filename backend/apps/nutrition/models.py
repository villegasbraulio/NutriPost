from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class MealRecommendation(models.Model):
    activity_log = models.OneToOneField(
        "activities.ActivityLog",
        on_delete=models.CASCADE,
        related_name="meal_recommendation",
    )
    calories_target = models.DecimalField(max_digits=8, decimal_places=2)
    protein_target_g = models.DecimalField(max_digits=8, decimal_places=2)
    carbs_target_g = models.DecimalField(max_digits=8, decimal_places=2)
    fat_target_g = models.DecimalField(max_digits=8, decimal_places=2)
    recommended_foods = models.JSONField(default=list)
    generated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("-generated_at",)

    def __str__(self) -> str:
        return f"Recommendation for activity #{self.activity_log_id}"


class PostWorkoutWorkflow(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        REMINDER_DUE = "reminder_due", "Reminder Due"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="post_workout_workflows",
        db_index=True,
    )
    activity_log = models.OneToOneField(
        "activities.ActivityLog",
        on_delete=models.CASCADE,
        related_name="post_workout_workflow",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    reminder_due_at = models.DateTimeField(db_index=True)
    reminder_triggered_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by_food_log = models.ForeignKey(
        "nutrition.FoodLog",
        on_delete=models.SET_NULL,
        related_name="completed_post_workout_workflows",
        null=True,
        blank=True,
    )
    reminder_message = models.TextField(blank=True, default="")
    last_evaluated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("status", "reminder_due_at", "-created_at")
        indexes = [
            models.Index(fields=("user", "status", "reminder_due_at")),
            models.Index(fields=("user", "created_at")),
        ]

    def __str__(self) -> str:
        return f"Post-workout workflow for activity #{self.activity_log_id}"


class FoodLog(models.Model):
    class MealType(models.TextChoices):
        BREAKFAST = "breakfast", "Breakfast"
        LUNCH = "lunch", "Lunch"
        DINNER = "dinner", "Dinner"
        SNACK = "snack", "Snack"
        POST_WORKOUT = "post_workout", "Post Workout"

    class NutritionSource(models.TextChoices):
        USDA = "usda", "USDA"
        OPEN_FOOD_FACTS = "open_food_facts", "Open Food Facts"
        AI = "ai", "AI estimate"
        MANUAL = "manual", "Manual entry"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="food_logs",
        db_index=True,
    )
    food_name = models.CharField(max_length=255)
    open_food_facts_id = models.CharField(max_length=100)
    nutrition_source = models.CharField(
        max_length=20,
        choices=NutritionSource.choices,
        default=NutritionSource.MANUAL,
    )
    source_item_id = models.CharField(max_length=120, blank=True, default="")
    source_metadata = models.JSONField(default=dict, blank=True)
    calories = models.DecimalField(max_digits=8, decimal_places=2)
    protein_g = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    carbs_g = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    fat_g = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    quantity_g = models.DecimalField(max_digits=8, decimal_places=2)
    meal_type = models.CharField(max_length=20, choices=MealType.choices)
    logged_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ("-logged_at",)
        indexes = [
            models.Index(fields=("user", "logged_at")),
            models.Index(fields=("user", "meal_type")),
            models.Index(fields=("user", "nutrition_source")),
        ]

    def __str__(self) -> str:
        return self.food_name


class DailyGoal(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="daily_goals",
        db_index=True,
    )
    date = models.DateField(db_index=True)
    calories_goal = models.DecimalField(max_digits=8, decimal_places=2)
    protein_goal_g = models.DecimalField(max_digits=8, decimal_places=2)
    carbs_goal_g = models.DecimalField(max_digits=8, decimal_places=2)
    fat_goal_g = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        ordering = ("-date",)
        constraints = [
            models.UniqueConstraint(fields=("user", "date"), name="unique_daily_goal_per_user")
        ]

    def __str__(self) -> str:
        return f"{self.user.username} goals for {self.date}"
