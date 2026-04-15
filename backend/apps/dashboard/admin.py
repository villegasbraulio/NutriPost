from django.contrib import admin

from .models import WeeklyInsight


@admin.register(WeeklyInsight)
class WeeklyInsightAdmin(admin.ModelAdmin):
    list_display = ("user", "period_start", "period_end", "generated_at")
    list_filter = ("generated_at",)
    search_fields = ("user__username", "content")
    ordering = ("-generated_at",)
