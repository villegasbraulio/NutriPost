from django.contrib import admin

from .models import ConversationMessage


@admin.register(ConversationMessage)
class ConversationMessageAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "created_at")
    list_filter = ("role", "created_at")
    search_fields = ("user__username", "content")
    ordering = ("-created_at",)
