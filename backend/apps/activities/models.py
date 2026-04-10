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
        from .services import calculate_net_calories_burned

        self.calories_burned = calculate_net_calories_burned(
            weight_kg=self.user.weight_kg,
            met_value=self.activity_type.met_value,
            duration_minutes=self.duration_minutes,
        )
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.user.username} - {self.activity_type.name}"
