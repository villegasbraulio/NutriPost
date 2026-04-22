from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class ActivityType(models.Model):
    class Category(models.TextChoices):
        CARDIO = "cardio", "Cardio"
        STRENGTH = "strength", "Strength"
        FLEXIBILITY = "flexibility", "Flexibility"
        SPORT = "sport", "Sport"

    name = models.CharField(max_length=100, unique=True)
    met_value = models.DecimalField(max_digits=4, decimal_places=2)
    category = models.CharField(max_length=20, choices=Category.choices)
    icon_name = models.CharField(max_length=50)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class GymRoutine(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="gym_routines",
        db_index=True,
    )
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    exercises = models.JSONField(default=list)
    adjusted_met = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    muscle_groups = models.JSONField(default=list, blank=True)
    estimated_duration_minutes = models.PositiveIntegerField(default=60)
    ai_analysis = models.TextField(null=True, blank=True)
    last_analyzed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)
        indexes = [
            models.Index(fields=("user", "updated_at")),
            models.Index(fields=("user", "name")),
        ]

    def __str__(self) -> str:
        return f"{self.user.username} - {self.name}"


class ActivityLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activity_logs",
        db_index=True,
    )
    activity_type = models.ForeignKey(
        ActivityType,
        on_delete=models.PROTECT,
        related_name="activity_logs",
        db_index=True,
    )
    gym_routine = models.ForeignKey(
        GymRoutine,
        on_delete=models.SET_NULL,
        related_name="activity_logs",
        null=True,
        blank=True,
        db_index=True,
    )
    duration_minutes = models.PositiveIntegerField()
    calories_burned = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    notes = models.TextField(blank=True)
    logged_at = models.DateTimeField(default=timezone.now, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-logged_at",)
        indexes = [
            models.Index(fields=("user", "logged_at")),
            models.Index(fields=("activity_type", "logged_at")),
        ]

    def save(self, *args, **kwargs):
        from .services import calculate_activity_log_net_calories

        self.calories_burned = calculate_activity_log_net_calories(self)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.user.username} - {self.activity_type.name}"
