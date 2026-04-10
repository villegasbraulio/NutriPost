from decimal import Decimal

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"

    class ActivityLevel(models.TextChoices):
        SEDENTARY = "sedentary", "Sedentary"
        LIGHT = "light", "Light"
        MODERATE = "moderate", "Moderate"
        ACTIVE = "active", "Active"
        VERY_ACTIVE = "very_active", "Very Active"

    class Goal(models.TextChoices):
        LOSE = "lose", "Lose"
        MAINTAIN = "maintain", "Maintain"
        GAIN = "gain", "Gain"

    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("70.00"))
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("170.00"))
    age = models.PositiveIntegerField(default=30)
    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
        default=Gender.OTHER,
    )
    activity_level = models.CharField(
        max_length=20,
        choices=ActivityLevel.choices,
        default=ActivityLevel.MODERATE,
    )
    goal = models.CharField(max_length=10, choices=Goal.choices, default=Goal.MAINTAIN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-date_joined",)

    def __str__(self) -> str:
        return self.username
