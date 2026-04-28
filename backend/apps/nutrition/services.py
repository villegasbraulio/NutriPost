import json
from collections import defaultdict
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

import requests
from django.conf import settings
from django.utils import timezone

from apps.activities.models import ActivityLog
from apps.activities.services import TIMING_WINDOW_MINUTES, calculate_timing_expires_at
from apps.core.ai_client import GroqServiceError, get_model
from apps.users.services import get_existing_daily_goal, sync_daily_goal

from .catalog import (
    FOOD_TYPE_BASE,
    FOOD_TYPE_MIXED,
    FOOD_TYPE_PACKAGED,
    get_source_label,
    infer_food_type,
    preferred_source_for_food_type,
    search_food_catalog,
)
from .models import DailyGoal, FoodLog, MealRecommendation, PostWorkoutWorkflow

POST_WORKOUT_NOTES = "Based on ISSN 2017 and ACSM/AND/DC 2016 position stands."
PROTEIN_MULTIPLIERS = {
    "lose": {"strength": Decimal("2.2"), "cardio": Decimal("1.8"), "flexibility": Decimal("1.4"), "sport": Decimal("2.0")},
    "reduce_fat": {"strength": Decimal("2.0"), "cardio": Decimal("1.6"), "flexibility": Decimal("1.3"), "sport": Decimal("1.8")},
    "maintain": {"strength": Decimal("1.8"), "cardio": Decimal("1.4"), "flexibility": Decimal("1.2"), "sport": Decimal("1.6")},
    "gain": {"strength": Decimal("2.4"), "cardio": Decimal("1.6"), "flexibility": Decimal("1.4"), "sport": Decimal("2.2")},
}
CARB_MULTIPLIERS = {
    "lose": {"strength": Decimal("0.8"), "cardio": Decimal("1.0"), "flexibility": Decimal("0.5"), "sport": Decimal("1.0")},
    "reduce_fat": {"strength": Decimal("1.0"), "cardio": Decimal("1.2"), "flexibility": Decimal("0.7"), "sport": Decimal("1.2")},
    "maintain": {"strength": Decimal("1.2"), "cardio": Decimal("1.4"), "flexibility": Decimal("0.8"), "sport": Decimal("1.3")},
    "gain": {"strength": Decimal("1.5"), "cardio": Decimal("1.6"), "flexibility": Decimal("1.0"), "sport": Decimal("1.5")},
}
FAT_TARGETS = {"lose": Decimal("5"), "reduce_fat": Decimal("8"), "maintain": Decimal("10"), "gain": Decimal("12")}


def quantize(value: Decimal) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_post_workout_macros(weight_kg, goal, activity_category, net_calories_burned):
    """
    Calculate evidence-based post-workout recovery targets from user goal and activity category.

    Formulae:
    - protein_g = protein_multiplier(goal, category) × weight_kg
    - carbs_g = carb_multiplier(goal, category) × weight_kg
    - fat_g = fixed low-fat target for the selected goal
    - total_calories = (protein_g × 4) + (carbs_g × 4) + (fat_g × 9)

    net_calories_burned is accepted for workout context symmetry, while total calories are derived from
    the recovery macro prescription itself.
    """

    _ = net_calories_burned
    weight = Decimal(str(weight_kg))
    protein_g = (PROTEIN_MULTIPLIERS[goal][activity_category] * weight).quantize(Decimal("0.1"))
    carbs_g = (CARB_MULTIPLIERS[goal][activity_category] * weight).quantize(Decimal("0.1"))
    fat_g = FAT_TARGETS[goal].quantize(Decimal("0.1"))
    total_calories = ((protein_g * Decimal("4")) + (carbs_g * Decimal("4")) + (fat_g * Decimal("9"))).quantize(
        Decimal("0.1")
    )

    return {
        "protein_g": float(protein_g),
        "carbs_g": float(carbs_g),
        "fat_g": float(fat_g),
        "total_calories": float(total_calories),
        "timing_window_minutes": TIMING_WINDOW_MINUTES,
        "notes": POST_WORKOUT_NOTES,
    }


def calculate_post_workout_targets(activity_log: ActivityLog) -> dict[str, Decimal | int | str]:
    """
    Translate workout recovery guidance into persisted recommendation targets for a saved activity.

    Formula:
    - Use goal-aware protein, carbohydrate, and fat multipliers
    - Store macro-derived calories as the post-workout meal calorie target
    """

    user = activity_log.user
    macro_targets = calculate_post_workout_macros(
        weight_kg=user.weight_kg,
        goal=user.goal,
        activity_category=activity_log.activity_type.category,
        net_calories_burned=activity_log.calories_burned,
    )

    return {
        "calories_target": quantize(Decimal(str(macro_targets["total_calories"]))),
        "protein_target_g": quantize(Decimal(str(macro_targets["protein_g"]))),
        "carbs_target_g": quantize(Decimal(str(macro_targets["carbs_g"]))),
        "fat_target_g": quantize(Decimal(str(macro_targets["fat_g"]))),
        "total_calories": quantize(Decimal(str(macro_targets["total_calories"]))),
        "timing_window_minutes": macro_targets["timing_window_minutes"],
        "notes": macro_targets["notes"],
    }


def build_fallback_foods(preference: str) -> list[dict]:
    fallback_catalog = {
        "protein": [
            {
                "id": "fallback-greek-yogurt",
                "name": "Greek Yogurt",
                "brand": "Fallback Pantry",
                "image_url": "",
                "calories_per_100g": 97,
                "protein_g": 10.0,
                "carbs_g": 3.6,
                "fat_g": 5.0,
            },
            {
                "id": "fallback-cottage-cheese",
                "name": "Cottage Cheese",
                "brand": "Fallback Pantry",
                "image_url": "",
                "calories_per_100g": 98,
                "protein_g": 11.0,
                "carbs_g": 3.4,
                "fat_g": 4.3,
            },
            {
                "id": "fallback-tuna",
                "name": "Tuna in Water",
                "brand": "Fallback Pantry",
                "image_url": "",
                "calories_per_100g": 116,
                "protein_g": 25.0,
                "carbs_g": 0.0,
                "fat_g": 0.8,
            },
        ],
        "carbs": [
            {
                "id": "fallback-banana",
                "name": "Banana",
                "brand": "Fallback Pantry",
                "image_url": "",
                "calories_per_100g": 89,
                "protein_g": 1.1,
                "carbs_g": 22.8,
                "fat_g": 0.3,
            },
            {
                "id": "fallback-oats",
                "name": "Oats",
                "brand": "Fallback Pantry",
                "image_url": "",
                "calories_per_100g": 389,
                "protein_g": 16.9,
                "carbs_g": 66.3,
                "fat_g": 6.9,
            },
            {
                "id": "fallback-rice",
                "name": "Cooked Rice",
                "brand": "Fallback Pantry",
                "image_url": "",
                "calories_per_100g": 130,
                "protein_g": 2.4,
                "carbs_g": 28.0,
                "fat_g": 0.3,
            },
        ],
        "balanced": [
            {
                "id": "fallback-chocolate-milk",
                "name": "Chocolate Milk",
                "brand": "Fallback Pantry",
                "image_url": "",
                "calories_per_100g": 83,
                "protein_g": 3.4,
                "carbs_g": 10.3,
                "fat_g": 1.9,
            },
            {
                "id": "fallback-salmon-rice",
                "name": "Salmon and Rice Bowl",
                "brand": "Fallback Pantry",
                "image_url": "",
                "calories_per_100g": 174,
                "protein_g": 12.0,
                "carbs_g": 17.0,
                "fat_g": 5.5,
            },
            {
                "id": "fallback-egg-toast",
                "name": "Egg and Toast",
                "brand": "Fallback Pantry",
                "image_url": "",
                "calories_per_100g": 190,
                "protein_g": 12.5,
                "carbs_g": 17.2,
                "fat_g": 7.0,
            },
        ],
    }
    return fallback_catalog.get(preference, fallback_catalog["balanced"])


def get_food_search_queries(activity_log: ActivityLog) -> tuple[list[str], str]:
    """Build Open Food Facts search terms based on the workout category and recovery emphasis."""
    category = activity_log.activity_type.category
    if category == "strength":
        return ["chicken breast", "greek yogurt", "cottage cheese", "tuna", "protein pudding"], "protein"
    if category == "cardio":
        return ["banana", "oats", "rice cakes", "wholegrain pasta", "chocolate milk"], "carbs"
    if category == "sport":
        return ["turkey sandwich", "wrap", "yogurt drink", "granola", "recovery bar"], "balanced"
    return ["greek yogurt", "fruit smoothie", "overnight oats", "cottage cheese"], "balanced"


def normalize_off_product(product: dict) -> dict | None:
    nutriments = product.get("nutriments") or {}
    name = product.get("product_name") or product.get("generic_name")
    if not name:
        return None

    calories = nutriments.get("energy-kcal_100g") or nutriments.get("energy-kcal")
    protein = nutriments.get("proteins_100g")
    carbs = nutriments.get("carbohydrates_100g")
    fat = nutriments.get("fat_100g")
    if calories is None or protein is None or carbs is None or fat is None:
        return None

    return {
        "id": product.get("_id") or product.get("code") or name.lower().replace(" ", "-"),
        "name": name,
        "brand": product.get("brands", ""),
        "image_url": product.get("image_front_small_url") or product.get("image_url") or "",
        "calories_per_100g": float(calories),
        "protein_g": float(protein),
        "carbs_g": float(carbs),
        "fat_g": float(fat),
    }


def search_open_food_facts(query: str, preference: str = "balanced", limit: int = 10) -> list[dict]:
    """Search Open Food Facts products and normalize macro data for frontend and recommendation use."""
    try:
        response = requests.get(
            f"{settings.OPEN_FOOD_FACTS_BASE_URL}/cgi/search.pl",
            params={
                "search_terms": query,
                "search_simple": 1,
                "action": "process",
                "json": 1,
                "page_size": limit,
                "fields": "_id,code,product_name,generic_name,brands,image_front_small_url,image_url,nutriments",
            },
            timeout=8,
        )
        response.raise_for_status()
        products = response.json().get("products", [])
    except requests.RequestException:
        return build_fallback_foods(preference)

    normalized = [item for item in (normalize_off_product(product) for product in products) if item]
    return normalized or build_fallback_foods(preference)


def score_food(product: dict, targets: dict[str, Decimal], preference: str) -> float:
    protein_gap = abs(product["protein_g"] - float(targets["protein_target_g"]) / 3)
    carbs_gap = abs(product["carbs_g"] - float(targets["carbs_target_g"]) / 3)
    fat_penalty = max(product["fat_g"] - float(targets["fat_target_g"]), 0)
    calories_gap = abs(product["calories_per_100g"] - float(targets["total_calories"]) / 3)

    score = protein_gap + carbs_gap + (fat_penalty * 2) + (calories_gap / 50)
    if preference == "protein":
        score -= product["protein_g"] * 0.15
    elif preference == "carbs":
        score -= product["carbs_g"] * 0.1
    return score


def recommendation_is_current(recommendation: MealRecommendation, targets: dict[str, Decimal | int | str]) -> bool:
    """Check whether a stored recommendation already matches the current recovery macro targets."""

    return (
        recommendation.calories_target == targets["calories_target"]
        and recommendation.protein_target_g == targets["protein_target_g"]
        and recommendation.carbs_target_g == targets["carbs_target_g"]
        and recommendation.fat_target_g == targets["fat_target_g"]
        and bool(recommendation.recommended_foods)
    )


def get_recovery_food_log_for_activity(activity_log: ActivityLog) -> FoodLog | None:
    """Return the earliest logged meal inside the post-workout recovery window."""

    timing_expires_at = calculate_timing_expires_at(activity_log.logged_at, TIMING_WINDOW_MINUTES)
    return (
        FoodLog.objects.filter(
            user=activity_log.user,
            logged_at__gte=activity_log.logged_at,
            logged_at__lte=timing_expires_at,
        )
        .order_by("logged_at", "id")
        .first()
    )


def build_post_workout_reminder_message(
    activity_log: ActivityLog,
    recommendation: MealRecommendation | None = None,
) -> str:
    """Create a ready-to-send reminder message from the current recommendation snapshot."""

    recommendation = recommendation or getattr(activity_log, "meal_recommendation", None)
    if recommendation is None:
        return (
            f"You finished {activity_log.activity_type.name.lower()} and your recovery window has passed. "
            "Log a recovery meal to keep your post-workout plan on track."
        )

    target_calories = round(float(recommendation.calories_target))
    target_protein = round(float(recommendation.protein_target_g))
    target_carbs = round(float(recommendation.carbs_target_g))
    top_foods = ", ".join(food["name"] for food in recommendation.recommended_foods[:3]) or "your recovery meal"

    return (
        f"You finished {activity_log.activity_type.name.lower()} and your recovery window has passed. "
        f"Aim for about {target_calories} kcal with {target_protein} g protein and {target_carbs} g carbs. "
        f"Suggested options: {top_foods}."
    )


def evaluate_post_workout_workflow(
    workflow: PostWorkoutWorkflow,
    *,
    now=None,
    recommendation: MealRecommendation | None = None,
) -> PostWorkoutWorkflow:
    """Refresh workflow state from meal logs and the current recovery deadline."""

    now = now or timezone.now()
    activity_log = workflow.activity_log
    completion_log = get_recovery_food_log_for_activity(activity_log)

    if completion_log is not None:
        workflow.status = PostWorkoutWorkflow.Status.COMPLETED
        workflow.completed_at = completion_log.logged_at
        workflow.completed_by_food_log = completion_log
        workflow.reminder_triggered_at = None
        workflow.reminder_message = ""
    elif now >= workflow.reminder_due_at:
        workflow.status = PostWorkoutWorkflow.Status.REMINDER_DUE
        workflow.completed_at = None
        workflow.completed_by_food_log = None
        workflow.reminder_triggered_at = workflow.reminder_triggered_at or now
        workflow.reminder_message = build_post_workout_reminder_message(activity_log, recommendation=recommendation)
    else:
        workflow.status = PostWorkoutWorkflow.Status.PENDING
        workflow.completed_at = None
        workflow.completed_by_food_log = None
        workflow.reminder_triggered_at = None
        workflow.reminder_message = ""

    workflow.last_evaluated_at = now
    workflow.save(
        update_fields=[
            "status",
            "completed_at",
            "completed_by_food_log",
            "reminder_triggered_at",
            "reminder_message",
            "last_evaluated_at",
            "updated_at",
        ]
    )

    from apps.dashboard.services import sync_dashboard_notification_for_workflow

    sync_dashboard_notification_for_workflow(workflow, now=now)
    return workflow


def sync_post_workout_workflow(
    activity_log: ActivityLog,
    *,
    recommendation: MealRecommendation | None = None,
    now=None,
) -> PostWorkoutWorkflow:
    """Create or update the persisted post-workout workflow for an activity log."""

    workflow, created = PostWorkoutWorkflow.objects.get_or_create(
        activity_log=activity_log,
        defaults={
            "user": activity_log.user,
            "reminder_due_at": calculate_timing_expires_at(activity_log.logged_at, TIMING_WINDOW_MINUTES),
        },
    )
    due_at = calculate_timing_expires_at(activity_log.logged_at, TIMING_WINDOW_MINUTES)
    fields_to_update = []

    if workflow.user_id != activity_log.user_id:
        workflow.user = activity_log.user
        fields_to_update.append("user")
    if workflow.reminder_due_at != due_at:
        workflow.reminder_due_at = due_at
        fields_to_update.append("reminder_due_at")

    if fields_to_update:
        workflow.save(update_fields=[*fields_to_update, "updated_at"])

    if created:
        workflow.refresh_from_db()

    return evaluate_post_workout_workflow(workflow, now=now, recommendation=recommendation)


def sync_post_workout_workflows_for_food_log(food_log: FoodLog, *, now=None) -> list[PostWorkoutWorkflow]:
    """Refresh active workflows that could be satisfied by a newly logged meal."""

    now = now or timezone.now()
    candidate_workflows = (
        PostWorkoutWorkflow.objects.filter(
            user=food_log.user,
            status__in=(
                PostWorkoutWorkflow.Status.PENDING,
                PostWorkoutWorkflow.Status.REMINDER_DUE,
            ),
            activity_log__logged_at__lte=food_log.logged_at,
            reminder_due_at__gte=food_log.logged_at,
        )
        .select_related("activity_log", "activity_log__activity_type")
        .order_by("reminder_due_at", "id")
    )

    refreshed = []
    for workflow in candidate_workflows:
        refreshed.append(evaluate_post_workout_workflow(workflow, now=now))
    return refreshed


def process_due_post_workout_workflows(*, now=None, limit: int | None = None) -> list[PostWorkoutWorkflow]:
    """Mark pending workflows as reminder-due once their recovery window expires."""

    now = now or timezone.now()
    queryset = (
        PostWorkoutWorkflow.objects.filter(
            status=PostWorkoutWorkflow.Status.PENDING,
            reminder_due_at__lte=now,
        )
        .select_related("activity_log", "activity_log__activity_type")
        .order_by("reminder_due_at", "id")
    )
    if limit is not None:
        queryset = queryset[:limit]

    refreshed = []
    for workflow in queryset:
        refreshed.append(evaluate_post_workout_workflow(workflow, now=now))
    return refreshed


def get_or_create_meal_recommendation(activity_log: ActivityLog) -> MealRecommendation:
    """Create a recommendation by matching recovery macro targets with Open Food Facts foods."""
    targets = calculate_post_workout_targets(activity_log)
    recommendation = getattr(activity_log, "meal_recommendation", None)
    if recommendation and recommendation_is_current(recommendation, targets):
        sync_post_workout_workflow(activity_log, recommendation=recommendation)
        return recommendation

    queries, preference = get_food_search_queries(activity_log)

    candidate_map: dict[str, dict] = {}
    for query in queries:
        for product in search_food_catalog(query, preference=preference, limit=8):
            candidate_map[product["id"]] = product

    ranked = sorted(
        candidate_map.values(),
        key=lambda product: score_food(product, targets, preference),
    )[:5]

    if recommendation:
        recommendation.calories_target = targets["calories_target"]
        recommendation.protein_target_g = targets["protein_target_g"]
        recommendation.carbs_target_g = targets["carbs_target_g"]
        recommendation.fat_target_g = targets["fat_target_g"]
        recommendation.recommended_foods = ranked
        recommendation.generated_at = timezone.now()
        recommendation.save(
            update_fields=[
                "calories_target",
                "protein_target_g",
                "carbs_target_g",
                "fat_target_g",
                "recommended_foods",
                "generated_at",
            ]
        )
        sync_post_workout_workflow(activity_log, recommendation=recommendation)
        return recommendation

    recommendation = MealRecommendation.objects.create(
        activity_log=activity_log,
        calories_target=targets["calories_target"],
        protein_target_g=targets["protein_target_g"],
        carbs_target_g=targets["carbs_target_g"],
        fat_target_g=targets["fat_target_g"],
        recommended_foods=ranked,
        generated_at=timezone.now(),
    )
    sync_post_workout_workflow(activity_log, recommendation=recommendation)
    return recommendation


def ensure_daily_goal(user, target_date: date) -> DailyGoal:
    """Ensure daily goals exist for a date using the latest TDEE-derived profile calculations."""
    existing_goal = get_existing_daily_goal(user, target_date)
    if existing_goal is not None:
        return existing_goal

    return sync_daily_goal(user, target_date)


def get_nutrition_totals_for_date(user, target_date: date) -> dict[str, Decimal]:
    """Aggregate daily food totals for calories and macros from logged foods on a target date."""
    aggregates = defaultdict(lambda: Decimal("0.00"))
    food_logs = FoodLog.objects.filter(user=user, logged_at__date=target_date)
    for food_log in food_logs:
        aggregates["calories"] += Decimal(food_log.calories)
        aggregates["protein_g"] += Decimal(food_log.protein_g)
        aggregates["carbs_g"] += Decimal(food_log.carbs_g)
        aggregates["fat_g"] += Decimal(food_log.fat_g)

    return {key: quantize(value) for key, value in aggregates.items()}


def strip_json_code_fences(raw_text: str) -> str:
    """Normalize AI output by removing optional markdown fences around JSON."""

    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
    start_index = cleaned.find("[")
    end_index = cleaned.rfind("]")
    if start_index != -1 and end_index != -1:
        cleaned = cleaned[start_index : end_index + 1]
    return cleaned


def normalize_parsed_meal_item(item: dict) -> dict:
    """Coerce meal-parsing fields into a stable JSON shape for the frontend."""

    quantity = max(float(item.get("estimated_quantity_g", 0) or 0), 0.0)
    calories = max(float(item.get("calories", 0) or 0), 0.0)
    protein = max(float(item.get("protein_g", 0) or 0), 0.0)
    carbs = max(float(item.get("carbs_g", 0) or 0), 0.0)
    fat = max(float(item.get("fat_g", 0) or 0), 0.0)
    confidence = str(item.get("confidence", "medium")).lower()
    if confidence not in {"high", "medium", "low"}:
        confidence = "medium"

    food_name = str(item.get("food_name") or "Unknown food").strip() or "Unknown food"
    query = str(item.get("search_query") or item.get("open_food_facts_query") or food_name).strip() or food_name
    food_type = str(item.get("food_type") or infer_food_type(f"{food_name} {query}", default=FOOD_TYPE_BASE)).lower()
    if food_type not in {FOOD_TYPE_BASE, FOOD_TYPE_PACKAGED, FOOD_TYPE_MIXED}:
        food_type = infer_food_type(f"{food_name} {query}", default=FOOD_TYPE_BASE)

    return {
        "food_name": food_name,
        "estimated_quantity_g": round(quantity, 1),
        "calories": round(calories, 1),
        "protein_g": round(protein, 1),
        "carbs_g": round(carbs, 1),
        "fat_g": round(fat, 1),
        "confidence": confidence,
        "food_type": food_type,
        "search_query": query,
    }


def build_source_metadata(
    *,
    nutrition_source: str,
    source_name: str,
    source_brand: str,
    search_query: str,
    food_type: str,
    parse_confidence: str,
    match_confidence: str,
    local_fallback: bool = False,
    fallback_reason: str = "",
) -> dict:
    return {
        "nutrition_source_label": get_source_label(nutrition_source),
        "source_name": source_name,
        "source_brand": source_brand,
        "search_query": search_query,
        "food_type": food_type,
        "parse_confidence": parse_confidence,
        "match_confidence": match_confidence,
        "local_fallback": local_fallback,
        "fallback_reason": fallback_reason,
    }


def build_ai_resolved_item(item: dict) -> dict:
    return {
        **item,
        "nutrition_source": FoodLog.NutritionSource.AI,
        "nutrition_source_label": get_source_label(FoodLog.NutritionSource.AI),
        "source_item_id": "",
        "source_name": item["food_name"],
        "source_brand": "",
        "match_confidence": "low",
        "source_metadata": build_source_metadata(
            nutrition_source=FoodLog.NutritionSource.AI,
            source_name=item["food_name"],
            source_brand="",
            search_query=item["search_query"],
            food_type=item["food_type"],
            parse_confidence=item["confidence"],
            match_confidence="low",
        ),
    }


def should_use_catalog_candidate(food_type: str, candidate: dict | None) -> bool:
    if not candidate or food_type == FOOD_TYPE_MIXED:
        return False

    match_confidence = candidate.get("match_confidence", "low")
    if match_confidence == "high":
        return True

    return match_confidence == "medium" and candidate["nutrition_source"] == preferred_source_for_food_type(food_type)


def apply_catalog_match_to_parsed_item(item: dict, candidate: dict) -> dict:
    quantity = max(float(item["estimated_quantity_g"]), 0.0)
    ratio = quantity / 100 if quantity > 0 else 0
    candidate_metadata = candidate.get("source_metadata", {})
    local_fallback = bool(candidate_metadata.get("local_fallback"))
    fallback_reason = str(candidate_metadata.get("fallback_reason") or "").strip()
    return {
        **item,
        "calories": round(candidate["calories_per_100g"] * ratio, 1),
        "protein_g": round(candidate["protein_g"] * ratio, 1),
        "carbs_g": round(candidate["carbs_g"] * ratio, 1),
        "fat_g": round(candidate["fat_g"] * ratio, 1),
        "nutrition_source": candidate["nutrition_source"],
        "nutrition_source_label": candidate["nutrition_source_label"],
        "source_item_id": candidate["source_item_id"],
        "source_name": candidate["name"],
        "source_brand": candidate.get("brand", ""),
        "match_confidence": candidate.get("match_confidence", "medium"),
        "source_metadata": build_source_metadata(
            nutrition_source=candidate["nutrition_source"],
            source_name=candidate["name"],
            source_brand=candidate.get("brand", ""),
            search_query=item["search_query"],
            food_type=item["food_type"],
            parse_confidence=item["confidence"],
            match_confidence=candidate.get("match_confidence", "medium"),
            local_fallback=local_fallback,
            fallback_reason=fallback_reason,
        ),
    }


def resolve_parsed_meal_item(item: dict) -> dict:
    preferred_source = preferred_source_for_food_type(item["food_type"])
    candidates = search_food_catalog(
        item["search_query"],
        preference="balanced",
        limit=5,
        preferred_source=preferred_source,
        food_type=item["food_type"],
    )
    best_candidate = candidates[0] if candidates else None
    if should_use_catalog_candidate(item["food_type"], best_candidate):
        return apply_catalog_match_to_parsed_item(item, best_candidate)
    return build_ai_resolved_item(item)


def parse_meal_from_text(description: str) -> dict:
    """
    Extract foods from a free-text meal description and resolve macros from USDA/OFF when possible.
    """

    prompt = f"""
Extract the individual food items from this meal description.
For each item:
- estimate a realistic quantity in grams
- estimate fallback macros for that quantity
- classify the item as one of:
  - "base_food": a generic whole food or single ingredient
  - "packaged_product": a branded or commercial packaged item
  - "mixed_dish": a composed dish with multiple ingredients
- provide a concise search_query that can be used against food databases

Meal: "{description}"

Return ONLY a valid JSON array with no explanation and no markdown fences:
[
  {{
    "food_name": "Oatmeal",
    "food_type": "base_food",
    "estimated_quantity_g": 80,
    "calories": 300,
    "protein_g": 10,
    "carbs_g": 54,
    "fat_g": 5,
    "confidence": "high",
    "search_query": "oatmeal rolled oats"
  }}
]

confidence values:
- "high": standard food, well-known macros
- "medium": common food but portion is estimated
- "low": ambiguous or unusual dish

Always return an array, even for a single item.
Return ONLY the JSON array. No text before or after it.
""".strip()

    model = get_model(temperature=0.1)
    response = model.generate_content(prompt)
    raw_text = getattr(response, "text", "").strip()
    if not raw_text:
        raise GroqServiceError("Groq returned an empty meal parsing response.")

    try:
        parsed_items = json.loads(strip_json_code_fences(raw_text))
    except json.JSONDecodeError as exc:
        raise ValueError("Groq returned an invalid meal JSON payload.") from exc

    if not isinstance(parsed_items, list):
        raise ValueError("Groq meal parsing response must be a JSON array.")

    normalized_items = [normalize_parsed_meal_item(item) for item in parsed_items if isinstance(item, dict)]
    resolved_items = [resolve_parsed_meal_item(item) for item in normalized_items]
    totals = {
        "total_calories": round(sum(item["calories"] for item in resolved_items), 1),
        "total_protein_g": round(sum(item["protein_g"] for item in resolved_items), 1),
        "total_carbs_g": round(sum(item["carbs_g"] for item in resolved_items), 1),
        "total_fat_g": round(sum(item["fat_g"] for item in resolved_items), 1),
    }
    return {"items": resolved_items, **totals}
