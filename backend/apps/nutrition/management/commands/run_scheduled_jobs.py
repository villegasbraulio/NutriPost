from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.nutrition.scheduler import run_scheduled_jobs


class Command(BaseCommand):
    help = "Run scheduled NutriPost automation jobs such as post-workout reminder processing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--post-workout-limit",
            type=int,
            default=None,
            help="Maximum number of due post-workout workflows to process in this run.",
        )
        parser.add_argument(
            "--insight-user-limit",
            type=int,
            default=None,
            help="Maximum number of users to consider for scheduled weekly insight generation.",
        )

    def handle(self, *args, **options):
        summary = run_scheduled_jobs(
            now=timezone.now(),
            post_workout_limit=options["post_workout_limit"],
            insight_user_limit=options["insight_user_limit"],
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Scheduled jobs ran at {summary['executed_at'].isoformat()} "
                f"with {summary['processed_total']} item(s) processed."
            )
        )
        for job in summary["jobs"]:
            self.stdout.write(
                f"- {job.name}: processed={job.processed}, "
                f"reminder_due={job.reminder_due}, completed={job.completed}, "
                f"notifications_synced={job.notifications_synced}, generated={job.generated}, "
                f"cached={job.cached}, failed={job.failed}, skipped={job.skipped}"
            )
