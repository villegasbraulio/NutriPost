from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from .filters import ActivityLogFilter
from .models import ActivityLog, ActivityType
from .serializers import ActivityLogSerializer, ActivityTypeSerializer
from apps.nutrition.services import get_or_create_meal_recommendation


class ActivityTypeViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ActivityTypeSerializer
    queryset = ActivityType.objects.all()
    pagination_class = None
    ordering = ("name",)


class ActivityLogViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ActivityLogSerializer
    filterset_class = ActivityLogFilter
    search_fields = ("activity_type__name", "notes")
    ordering_fields = ("logged_at", "calories_burned", "duration_minutes")
    ordering = ("-logged_at",)

    def get_queryset(self):
        queryset = (
            ActivityLog.objects.select_related("activity_type", "user")
            .filter(user=self.request.user)
            .order_by("-logged_at")
        )
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["include_recommendation"] = self.action in {"create", "retrieve"}
        return context

    def perform_create(self, serializer):
        activity_log = serializer.save(user=self.request.user)
        recommendation = get_or_create_meal_recommendation(activity_log)
        serializer.context.setdefault("recommendation_cache", {})[activity_log.pk] = recommendation
