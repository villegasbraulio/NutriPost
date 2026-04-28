from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .filters import ActivityLogFilter
from .models import ActivityLog, ActivityType, GymRoutine
from .serializers import (
    ActivityLogSerializer,
    ActivityTypeSerializer,
    GymRoutineSerializer,
    RoutineParseFileSerializer,
    RoutineParseTextSerializer,
)
from .services import analyze_routine_met, parse_routine_from_file, parse_routine_from_text
from apps.nutrition.services import ensure_daily_goal, get_or_create_meal_recommendation


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
            ActivityLog.objects.select_related("activity_type", "user", "gym_routine")
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
        ensure_daily_goal(self.request.user, activity_log.logged_at.date())
        recommendation = get_or_create_meal_recommendation(activity_log)
        serializer.context.setdefault("recommendation_cache", {})[activity_log.pk] = recommendation


class GymRoutineViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = GymRoutineSerializer
    ordering_fields = ("updated_at", "created_at", "name", "adjusted_met", "estimated_duration_minutes")
    ordering = ("-updated_at",)
    search_fields = ("name", "description")
    pagination_class = None

    def get_queryset(self):
        return (
            GymRoutine.objects.filter(user=self.request.user)
            .prefetch_related("activity_logs")
            .order_by("-updated_at")
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["include_routine_history"] = self.action == "retrieve"
        return context

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def analyze(self, request, pk=None):
        routine = self.get_object()
        try:
            analysis = analyze_routine_met(routine, request.user.weight_kg)
        except ValueError as exc:
            raise serializers.ValidationError({"message": str(exc), "code": "routine_analysis_invalid_json"}) from exc

        serializer = self.get_serializer(routine)
        return Response({"analysis": analysis, "routine": serializer.data}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="parse-text")
    def parse_text(self, request):
        serializer = RoutineParseTextSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            parsed = parse_routine_from_text(
                raw_text=serializer.validated_data["raw_text"],
                user_weight_kg=request.user.weight_kg,
            )
        except ValueError as exc:
            raise serializers.ValidationError({"message": str(exc), "code": "routine_parse_invalid_json"}) from exc

        return Response(parsed, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="parse-file", parser_classes=[MultiPartParser, FormParser])
    def parse_file(self, request):
        serializer = RoutineParseFileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            parsed = parse_routine_from_file(
                uploaded_file=serializer.validated_data["file"],
                user_weight_kg=request.user.weight_kg,
            )
        except ValueError as exc:
            raise serializers.ValidationError({"message": str(exc), "code": "routine_file_parse_failed"}) from exc

        return Response(parsed, status=status.HTTP_200_OK)
