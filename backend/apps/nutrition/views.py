from django.shortcuts import get_object_or_404
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import ValidationError

from apps.activities.models import ActivityLog

from .filters import FoodLogFilter
from .models import FoodLog, PostWorkoutWorkflow
from .serializers import (
    FoodLogSerializer,
    MealRecommendationSerializer,
    ParseMealSerializer,
    ParsedMealResponseSerializer,
    PostWorkoutWorkflowSerializer,
)
from .services import (
    ensure_daily_goal,
    get_or_create_meal_recommendation,
    parse_meal_from_text,
    sync_post_workout_workflows_for_food_log,
)
from .catalog import search_food_catalog


class MealRecommendationViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MealRecommendationSerializer

    def retrieve(self, request, pk=None):
        activity_log = get_object_or_404(
            ActivityLog.objects.select_related("user", "activity_type"),
            pk=pk,
            user=request.user,
        )
        recommendation = get_or_create_meal_recommendation(activity_log)
        return Response(self.get_serializer(recommendation).data)


class FoodSearchViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def search(self, request):
        query = request.query_params.get("q", "").strip()
        category = request.query_params.get("category", "balanced").strip() or "balanced"
        if not query:
            return Response([])
        return Response(search_food_catalog(query=query, preference=category, limit=12))


class FoodLogViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FoodLogSerializer
    filterset_class = FoodLogFilter
    search_fields = ("food_name", "open_food_facts_id", "source_item_id")
    ordering_fields = ("logged_at", "calories", "protein_g")
    ordering = ("-logged_at",)

    def get_queryset(self):
        return FoodLog.objects.filter(user=self.request.user).order_by("-logged_at")

    def perform_create(self, serializer):
        food_log = serializer.save(user=self.request.user)
        ensure_daily_goal(self.request.user, food_log.logged_at.date())
        sync_post_workout_workflows_for_food_log(food_log)


class PostWorkoutWorkflowViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PostWorkoutWorkflowSerializer
    ordering = ("status", "reminder_due_at", "-created_at")

    def get_queryset(self):
        queryset = (
            PostWorkoutWorkflow.objects.filter(user=self.request.user)
            .select_related("activity_log", "activity_log__activity_type", "completed_by_food_log")
            .order_by(*self.ordering)
        )
        status_filter = self.request.query_params.get("status", "").strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


class NutritionAIViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"], url_path="parse-meal")
    def parse_meal(self, request):
        serializer = ParseMealSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payload = parse_meal_from_text(serializer.validated_data["description"])
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        return Response(ParsedMealResponseSerializer(payload).data)
