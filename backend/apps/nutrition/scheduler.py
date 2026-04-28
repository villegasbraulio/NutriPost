from dataclasses import dataclass

from django.utils import timezone

from apps.dashboard.services import generate_scheduled_weekly_insights
from .models import PostWorkoutWorkflow
from .services import process_due_post_workout_workflows


@dataclass
class ScheduledJobSummary:
    name: str
    processed: int
    reminder_due: int = 0
    completed: int = 0
    notifications_synced: int = 0
    generated: int = 0
    cached: int = 0
    failed: int = 0
    skipped: int = 0


def run_scheduled_jobs(*, now=None, post_workout_limit: int | None = None, insight_user_limit: int | None = None) -> dict:
    """Run recurring backend automation jobs and return a compact execution summary."""

    now = now or timezone.now()
    processed_workflows = process_due_post_workout_workflows(
        now=now,
        limit=post_workout_limit,
    )
    post_workout_summary = ScheduledJobSummary(
        name="post_workout_workflows",
        processed=len(processed_workflows),
        reminder_due=sum(
            1
            for workflow in processed_workflows
            if workflow.status == PostWorkoutWorkflow.Status.REMINDER_DUE
        ),
        completed=sum(
            1
            for workflow in processed_workflows
            if workflow.status == PostWorkoutWorkflow.Status.COMPLETED
        ),
        notifications_synced=sum(
            1
            for workflow in processed_workflows
            if getattr(workflow, "dashboard_notification", None) is not None
        ),
    )
    insight_summary = generate_scheduled_weekly_insights(
        now=now,
        user_limit=insight_user_limit,
    )
    weekly_insights_summary = ScheduledJobSummary(
        name="weekly_insights",
        processed=insight_summary.processed,
        notifications_synced=insight_summary.notifications_synced,
        generated=insight_summary.generated,
        cached=insight_summary.cached,
        failed=insight_summary.failed,
        skipped=insight_summary.skipped,
    )

    return {
        "executed_at": now,
        "jobs": [post_workout_summary, weekly_insights_summary],
        "processed_total": post_workout_summary.processed + weekly_insights_summary.processed,
    }
