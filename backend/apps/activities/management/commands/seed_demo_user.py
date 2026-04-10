from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.activities.services import seed_activity_types, seed_demo_user_data

User = get_user_model()


class Command(BaseCommand):
    help = "Create a demo user with 30 days of activity and nutrition data."

    def handle(self, *args, **options):
        seed_activity_types()
        user, created = User.objects.get_or_create(
            username="demo",
            defaults={
                "email": "demo@nutripost.dev",
                "first_name": "Demo",
                "last_name": "Athlete",
                "weight_kg": "74.50",
                "height_cm": "178.00",
                "age": 29,
                "gender": "male",
                "activity_level": "active",
                "goal": "maintain",
            },
        )
        user.set_password("DemoPass123!")
        user.save()

        seed_demo_user_data(user=user, days=30)
        verb = "Updated" if not created else "Created"
        self.stdout.write(
            self.style.SUCCESS(f"{verb} demo user 'demo' with password 'DemoPass123!'.")
        )
