from django.utils import timezone
from rest_framework import serializers

from .models import DashboardNotification
from .services import is_spanish_language_hint


def serialize_datetime(value):
    if value is None:
        return None
    return timezone.localtime(value).isoformat()


class DashboardNotificationSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()
    action_label = serializers.SerializerMethodField()
    action_url = serializers.SerializerMethodField()
    activity_log_id = serializers.SerializerMethodField()
    activity_name = serializers.SerializerMethodField()
    insight_language = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()
    read_at = serializers.SerializerMethodField()

    class Meta:
        model = DashboardNotification
        fields = (
            "id",
            "kind",
            "title",
            "message",
            "action_label",
            "action_url",
            "activity_log_id",
            "activity_name",
            "insight_language",
            "is_read",
            "created_at",
            "read_at",
        )
        read_only_fields = fields

    def _is_spanish(self) -> bool:
        request = self.context.get("request")
        hint = request.headers.get("Accept-Language") if request else None
        return is_spanish_language_hint(hint)

    def get_title(self, obj: DashboardNotification) -> str:
        if obj.kind == DashboardNotification.Kind.WEEKLY_INSIGHT:
            if self._is_spanish():
                return "Nuevo insight semanal"
            return "New weekly insight"
        if self._is_spanish():
            return "Recuperacion pendiente"
        return "Recovery reminder"

    def get_message(self, obj: DashboardNotification) -> str:
        if obj.kind == DashboardNotification.Kind.WEEKLY_INSIGHT:
            if self._is_spanish():
                return "Tu nuevo insight semanal ya esta listo en el dashboard."
            return "Your new weekly insight is ready on the dashboard."

        activity_name = obj.workflow.activity_log.activity_type.name
        if self._is_spanish():
            return (
                f"No se registro una comida de recuperacion para {activity_name}. "
                "Abre la actividad y carga una comida sugerida para cerrar el workflow."
            )
        return (
            f"No recovery meal was logged for {activity_name}. "
            "Open the activity and log one of the suggested meals to close the workflow."
        )

    def get_action_label(self, obj: DashboardNotification) -> str:
        if obj.kind == DashboardNotification.Kind.WEEKLY_INSIGHT:
            if self._is_spanish():
                return "Ver insight"
            return "View insight"
        if self._is_spanish():
            return "Abrir actividad"
        return "Open activity"

    def get_action_url(self, obj: DashboardNotification) -> str:
        if obj.kind == DashboardNotification.Kind.WEEKLY_INSIGHT:
            return "/dashboard#weekly-insight"
        return f"/activities/logs/{obj.workflow.activity_log_id}"

    def get_activity_log_id(self, obj: DashboardNotification):
        if obj.workflow_id is None:
            return None
        return obj.workflow.activity_log_id

    def get_activity_name(self, obj: DashboardNotification):
        if obj.workflow_id is None:
            return ""
        return obj.workflow.activity_log.activity_type.name

    def get_insight_language(self, obj: DashboardNotification):
        if obj.weekly_insight_id is None:
            return ""
        return obj.weekly_insight.language

    def get_created_at(self, obj: DashboardNotification):
        return serialize_datetime(obj.created_at)

    def get_read_at(self, obj: DashboardNotification):
        return serialize_datetime(obj.read_at)
