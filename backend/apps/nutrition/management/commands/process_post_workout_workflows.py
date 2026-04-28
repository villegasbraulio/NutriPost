from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.nutrition.models import PostWorkoutWorkflow
from apps.nutrition.services import process_due_post_workout_workflows


class Command(BaseCommand):
    help = "Process expired post-workout recovery workflows and mark reminders as due."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Maximum number of pending workflows to process.",
        )

    def handle(self, *args, **options):
        now = timezone.now()
        due_before = PostWorkoutWorkflow.objects.filter(
            status=PostWorkoutWorkflow.Status.PENDING,
            reminder_due_at__lte=now,
        ).count()
        processed = process_due_post_workout_workflows(now=now, limit=options["limit"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Processed {len(processed)} workflow(s); {due_before} workflow(s) were eligible at {now.isoformat()}."
            )
        )
