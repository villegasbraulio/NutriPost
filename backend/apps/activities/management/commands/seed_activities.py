from django.core.management.base import BaseCommand

from apps.activities.services import seed_activity_types


class Command(BaseCommand):
    help = "Seed the database with 30+ activity types and MET values."

    def handle(self, *args, **options):
        activities = seed_activity_types()
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(activities)} activity types."))
