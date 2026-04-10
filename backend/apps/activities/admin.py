from django.contrib import admin

from .models import ActivityLog, ActivityType


@admin.register(ActivityType)
class ActivityTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "met_value", "icon_name")
    search_fields = ("name", "category")


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("user", "activity_type", "duration_minutes", "calories_burned", "logged_at")
    list_filter = ("activity_type__category", "logged_at")
    search_fields = ("user__username", "activity_type__name")
