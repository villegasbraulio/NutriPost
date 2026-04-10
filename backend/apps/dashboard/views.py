from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .services import build_progress, build_streak, build_summary


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
