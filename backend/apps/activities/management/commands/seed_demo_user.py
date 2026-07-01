from django.core.management.base import BaseCommand

from apps.users.services import ensure_public_demo_user


class Command(BaseCommand):
    help = "Create a demo user with 30 days of activity and nutrition data."

    def handle(self, *args, **options):
        user = ensure_public_demo_user(seed_data=True)
        self.stdout.write(
            self.style.SUCCESS(
                f"Prepared demo user '{user.username}' with public demo access managed by settings."
            )
        )
