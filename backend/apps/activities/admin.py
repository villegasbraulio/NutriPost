from django.contrib import admin

from .models import ActivityLog, ActivityType, GymRoutine


@admin.register(ActivityType)
class ActivityTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "met_value", "icon_name")
    search_fields = ("name", "category")


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("user", "activity_type", "gym_routine", "duration_minutes", "calories_burned", "logged_at")
    list_filter = ("activity_type__category", "logged_at")
    search_fields = ("user__username", "activity_type__name", "gym_routine__name")


@admin.register(GymRoutine)
class GymRoutineAdmin(admin.ModelAdmin):
    list_display = ("user", "name", "adjusted_met", "estimated_duration_minutes", "last_analyzed_at", "updated_at")
    list_filter = ("last_analyzed_at", "updated_at")
    search_fields = ("user__username", "name", "description")
    readonly_fields = ("created_at", "updated_at", "last_analyzed_at")
