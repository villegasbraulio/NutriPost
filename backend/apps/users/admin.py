from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "NutriPost Profile",
            {
                "fields": (
                    "weight_kg",
                    "height_cm",
                    "age",
                    "gender",
                    "activity_level",
                    "goal",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )
    readonly_fields = ("created_at", "updated_at")
    list_display = ("username", "email", "goal", "activity_level", "is_staff")
