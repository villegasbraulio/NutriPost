import json
from collections import defaultdict
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

import requests
from django.conf import settings
from django.utils import timezone

from apps.activities.models import ActivityLog
from apps.activities.services import TIMING_WINDOW_MINUTES
from apps.core.ai_client import GroqServiceError, get_model
from apps.users.services import sync_daily_goal

from .models import DailyGoal, FoodLog, MealRecommendation

POST_WORKOUT_NOTES = "Based on ISSN 2017 and ACSM/AND/DC 2016 position stands."
PROTEIN_MULTIPLIERS = {
    "lose": {"strength": Decimal("2.2"), "cardio": Decimal("1.8"), "flexibility": Decimal("1.4"), "sport": Decimal("2.0")},
    "maintain": {"strength": Decimal("1.8"), "cardio": Decimal("1.4"), "flexibility": Decimal("1.2"), "sport": Decimal("1.6")},
    "gain": {"strength": Decimal("2.4"), "cardio": Decimal("1.6"), "flexibility": Decimal("1.4"), "sport": Decimal("2.2")},
}
CARB_MULTIPLIERS = {
    "lose": {"strength": Decimal("0.8"), "cardio": Decimal("1.0"), "flexibility": Decimal("0.5"), "sport": Decimal("1.0")},
    "maintain": {"strength": Decimal("1.2"), "cardio": Decimal("1.4"), "flexibility": Decimal("0.8"), "sport": Decimal("1.3")},
    "gain": {"strength": Decimal("1.5"), "cardio": Decimal("1.6"), "flexibility": Decimal("1.0"), "sport": Decimal("1.5")},
}
FAT_TARGETS = {"lose": Decimal("5"), "maintain": Decimal("10"), "gain": Decimal("12")}


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


def get_or_create_meal_recommendation(activity_log: ActivityLog) -> MealRecommendation:
    """Create a recommendation by matching recovery macro targets with Open Food Facts foods."""
    targets = calculate_post_workout_targets(activity_log)
    recommendation = getattr(activity_log, "meal_recommendation", None)
    if recommendation and recommendation_is_current(recommendation, targets):
        return recommendation

    queries, preference = get_food_search_queries(activity_log)

    candidate_map: dict[str, dict] = {}
    for query in queries:
        for product in search_open_food_facts(query, preference=preference, limit=8):
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
    return recommendation


def ensure_daily_goal(user, target_date: date) -> DailyGoal:
    """Ensure daily goals exist for a date using the latest TDEE-derived profile calculations."""
    sync_daily_goal(user, target_date)
    return DailyGoal.objects.get(user=user, date=target_date)


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
    query = str(item.get("open_food_facts_query") or food_name).strip() or food_name

    return {
        "food_name": food_name,
        "estimated_quantity_g": round(quantity, 1),
        "calories": round(calories, 1),
        "protein_g": round(protein, 1),
        "carbs_g": round(carbs, 1),
        "fat_g": round(fat, 1),
        "confidence": confidence,
        "open_food_facts_query": query,
    }


def parse_meal_from_text(description: str) -> dict:
    """
    Extract foods and estimated macros from a free-text meal description using Groq.
    """

    prompt = f"""
Extract the individual food items from this meal description and estimate
their macros. Use realistic portion sizes for a typical adult meal.

Meal: "{description}"

Return ONLY a valid JSON array with no explanation and no markdown fences:
[
  {{
    "food_name": "Oatmeal",
    "estimated_quantity_g": 80,
    "calories": 300,
    "protein_g": 10,
    "carbs_g": 54,
    "fat_g": 5,
    "confidence": "high",
    "open_food_facts_query": "oatmeal rolled oats"
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
    totals = {
        "total_calories": round(sum(item["calories"] for item in normalized_items), 1),
        "total_protein_g": round(sum(item["protein_g"] for item in normalized_items), 1),
        "total_carbs_g": round(sum(item["carbs_g"] for item in normalized_items), 1),
        "total_fat_g": round(sum(item["fat_g"] for item in normalized_items), 1),
    }
    return {"items": normalized_items, **totals}
