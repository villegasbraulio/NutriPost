from django.conf import settings
from django.db import models
from django.utils import timezone


class WeeklyInsight(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="weekly_insights",
        db_index=True,
    )
    content = models.TextField()
    period_start = models.DateField(db_index=True)
    period_end = models.DateField(db_index=True)
    language = models.CharField(max_length=12, default="en", db_index=True)
    generated_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ("-generated_at",)
        indexes = [
            models.Index(fields=("user", "generated_at")),
            models.Index(fields=("user", "period_start", "period_end")),
            models.Index(fields=("user", "period_start", "period_end", "language")),
        ]

    def __str__(self) -> str:
        return f"{self.user.username} insight ({self.language}) for {self.period_start} to {self.period_end}"


class DashboardNotification(models.Model):
    class Kind(models.TextChoices):
        POST_WORKOUT_REMINDER = "post_workout_reminder", "Post Workout Reminder"
        WEEKLY_INSIGHT = "weekly_insight", "Weekly Insight"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dashboard_notifications",
        db_index=True,
    )
    workflow = models.OneToOneField(
        "nutrition.PostWorkoutWorkflow",
        on_delete=models.CASCADE,
        related_name="dashboard_notification",
        null=True,
        blank=True,
    )
    weekly_insight = models.OneToOneField(
        "dashboard.WeeklyInsight",
        on_delete=models.CASCADE,
        related_name="dashboard_notification",
        null=True,
        blank=True,
    )
    kind = models.CharField(max_length=40, choices=Kind.choices, db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("is_read", "-created_at")
        indexes = [
            models.Index(fields=("user", "is_read", "created_at")),
            models.Index(fields=("user", "kind", "created_at")),
        ]

    def __str__(self) -> str:
        return f"{self.user.username} {self.kind} notification"
