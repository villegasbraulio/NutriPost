from django.contrib import admin

from .models import DashboardNotification, WeeklyInsight


@admin.register(WeeklyInsight)
class WeeklyInsightAdmin(admin.ModelAdmin):
    list_display = ("user", "language", "period_start", "period_end", "generated_at")
    list_filter = ("language", "generated_at")
    search_fields = ("user__username", "content")
    ordering = ("-generated_at",)


@admin.register(DashboardNotification)
class DashboardNotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "kind", "is_read", "created_at", "read_at")
    list_filter = ("kind", "is_read", "created_at")
    search_fields = ("user__username", "workflow__activity_log__activity_type__name", "weekly_insight__content")
    ordering = ("is_read", "-created_at")
