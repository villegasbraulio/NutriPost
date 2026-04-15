from django.conf import settings
from django.db import models


class ConversationMessage(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversation_messages",
        db_index=True,
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("created_at",)
        indexes = [
            models.Index(fields=("user", "created_at")),
            models.Index(fields=("user", "role")),
        ]

    def __str__(self) -> str:
        return f"{self.user.username} {self.role} message at {self.created_at.isoformat()}"
