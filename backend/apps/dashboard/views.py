from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import DashboardNotification
from .serializers import DashboardNotificationSerializer
from .services import (
    build_progress,
    build_streak,
    build_summary,
    get_dashboard_notifications,
    get_weekly_insight,
    mark_dashboard_notification_as_read,
)


class DashboardViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def summary(self, request):
        period = request.query_params.get("period", "7d")
        return Response(build_summary(request.user, period))

    @action(detail=False, methods=["get"])
    def streak(self, request):
        return Response(build_streak(request.user))

    @action(detail=False, methods=["get"])
    def progress(self, request):
        return Response(build_progress(request.user))

    @action(detail=False, methods=["get"])
    def insights(self, request):
        return Response(get_weekly_insight(request.user, language_hint=request.headers.get("Accept-Language")))


class DashboardNotificationViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DashboardNotificationSerializer

    def get_queryset(self):
        unread_only = self.request.query_params.get("unread", "").lower() == "true"
        return get_dashboard_notifications(self.request.user, unread_only=unread_only)

    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "count": queryset.count(),
                "results": serializer.data,
            }
        )

    @action(detail=True, methods=["post"], url_path="dismiss")
    def dismiss(self, request, pk=None):
        notification = get_object_or_404(self.get_queryset(), pk=pk)
        mark_dashboard_notification_as_read(notification)
        return Response(self.get_serializer(notification).data)
