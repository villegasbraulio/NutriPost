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
    generated_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ("-generated_at",)
        indexes = [
            models.Index(fields=("user", "generated_at")),
            models.Index(fields=("user", "period_start", "period_end")),
        ]

    def __str__(self) -> str:
        return f"{self.user.username} insight for {self.period_start} to {self.period_end}"
