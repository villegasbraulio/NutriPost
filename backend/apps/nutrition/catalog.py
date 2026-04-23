from __future__ import annotations

from collections.abc import Iterable

import requests
from django.conf import settings

NUTRITION_SOURCE_LABELS = {
    "usda": "USDA",
    "open_food_facts": "Open Food Facts",
    "ai": "AI estimate",
    "manual": "Manual entry",
}
FOOD_TYPE_BASE = "base_food"
FOOD_TYPE_PACKAGED = "packaged_product"
FOOD_TYPE_MIXED = "mixed_dish"

PACKAGED_QUERY_TERMS = {
    "bar",
    "bars",
    "biscuit",
    "biscuits",
    "bottle",
    "brand",
    "candy",
    "can",
    "cereal",
    "chips",
    "chocolate milk",
    "cola",
    "cookie",
    "cookies",
    "cracker",
    "crackers",
    "drink",
    "juice",
    "pack",
    "packaged",
    "powder",
    "product",
    "protein shake",
    "protein bar",
    "soda",
    "sports drink",
    "wrapper",
    "yogurt drink",
}
MIXED_DISH_TERMS = {
    "bowl",
    "burger",
    "burrito",
    "curry",
    "dish",
    "fajita",
    "pasta",
    "pizza",
    "plate",
    "salad",
    "sandwich",
    "soup",
    "stew",
    "taco",
    "toast",
    "wrap",
}
USDA_NUTRIENT_MAP = {
    "calories_per_100g": {"ids": {"1008"}, "numbers": {"208", "1008"}},
    "protein_g": {"ids": {"1003"}, "numbers": {"203", "1003"}},
    "fat_g": {"ids": {"1004"}, "numbers": {"204", "1004"}},
    "carbs_g": {"ids": {"1005"}, "numbers": {"205", "1005"}},
}


def build_catalog_entry(
    *,
    nutrition_source: str,
    source_item_id: str,
    name: str,
    calories_per_100g: float,
    protein_g: float,
    carbs_g: float,
    fat_g: float,
    brand: str = "",
    image_url: str = "",
    local_fallback: bool = False,
) -> dict:
    source_id = str(source_item_id)
    return {
        "id": f"{nutrition_source}:{source_id}",
        "nutrition_source": nutrition_source,
        "nutrition_source_label": NUTRITION_SOURCE_LABELS[nutrition_source],
        "source_item_id": source_id,
        "name": name,
        "brand": brand,
        "image_url": image_url,
        "calories_per_100g": round(float(calories_per_100g), 1),
        "protein_g": round(float(protein_g), 1),
        "carbs_g": round(float(carbs_g), 1),
        "fat_g": round(float(fat_g), 1),
        "source_metadata": {
            "source_name": name,
            "source_brand": brand,
            "local_fallback": local_fallback,
            "nutrition_source_label": NUTRITION_SOURCE_LABELS[nutrition_source],
        },
    }


def with_fallback_reason(results: Iterable[dict], fallback_reason: str) -> list[dict]:
    annotated = []
    for item in results:
        source_metadata = {
            **(item.get("source_metadata") or {}),
            "fallback_reason": fallback_reason,
        }
        annotated.append({**item, "source_metadata": source_metadata})
    return annotated


LOCAL_USDA_FOODS = [
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-chicken-breast",
        name="Chicken Breast, roasted, skinless",
        calories_per_100g=165,
        protein_g=31.0,
        carbs_g=0.0,
        fat_g=3.6,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-white-rice",
        name="White Rice, cooked",
        calories_per_100g=130,
        protein_g=2.4,
        carbs_g=28.2,
        fat_g=0.3,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-brown-rice",
        name="Brown Rice, cooked",
        calories_per_100g=111,
        protein_g=2.6,
        carbs_g=23.0,
        fat_g=0.9,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-oats",
        name="Rolled Oats, dry",
        calories_per_100g=389,
        protein_g=16.9,
        carbs_g=66.3,
        fat_g=6.9,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-banana",
        name="Banana, raw",
        calories_per_100g=89,
        protein_g=1.1,
        carbs_g=22.8,
        fat_g=0.3,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-apple",
        name="Apple, raw",
        calories_per_100g=52,
        protein_g=0.3,
        carbs_g=13.8,
        fat_g=0.2,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-egg",
        name="Egg, whole",
        calories_per_100g=143,
        protein_g=12.6,
        carbs_g=0.7,
        fat_g=9.5,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-egg-white",
        name="Egg White",
        calories_per_100g=52,
        protein_g=10.9,
        carbs_g=0.7,
        fat_g=0.2,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-salmon",
        name="Salmon, cooked",
        calories_per_100g=206,
        protein_g=22.1,
        carbs_g=0.0,
        fat_g=12.4,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-tuna",
        name="Tuna in Water",
        calories_per_100g=116,
        protein_g=25.5,
        carbs_g=0.0,
        fat_g=0.8,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-greek-yogurt",
        name="Greek Yogurt, plain, nonfat",
        calories_per_100g=59,
        protein_g=10.3,
        carbs_g=3.6,
        fat_g=0.4,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-milk",
        name="Milk, 2% fat",
        calories_per_100g=50,
        protein_g=3.4,
        carbs_g=4.8,
        fat_g=2.0,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-broccoli",
        name="Broccoli, cooked",
        calories_per_100g=35,
        protein_g=2.4,
        carbs_g=7.2,
        fat_g=0.4,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-potato",
        name="Potato, baked",
        calories_per_100g=93,
        protein_g=2.5,
        carbs_g=21.2,
        fat_g=0.1,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-sweet-potato",
        name="Sweet Potato, baked",
        calories_per_100g=90,
        protein_g=2.0,
        carbs_g=20.7,
        fat_g=0.2,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-whole-wheat-pasta",
        name="Whole Wheat Pasta, cooked",
        calories_per_100g=149,
        protein_g=5.8,
        carbs_g=30.9,
        fat_g=0.9,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-lean-ground-beef",
        name="Lean Ground Beef, cooked",
        calories_per_100g=217,
        protein_g=26.1,
        carbs_g=0.0,
        fat_g=11.8,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-avocado",
        name="Avocado, raw",
        calories_per_100g=160,
        protein_g=2.0,
        carbs_g=8.5,
        fat_g=14.7,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-almonds",
        name="Almonds, raw",
        calories_per_100g=579,
        protein_g=21.2,
        carbs_g=21.6,
        fat_g=49.9,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="usda",
        source_item_id="usda-local-cottage-cheese",
        name="Cottage Cheese, low fat",
        calories_per_100g=84,
        protein_g=11.1,
        carbs_g=4.3,
        fat_g=2.3,
        local_fallback=True,
    ),
]

LOCAL_PACKAGED_FOODS = [
    build_catalog_entry(
        nutrition_source="open_food_facts",
        source_item_id="off-local-chocolate-milk",
        name="Chocolate Milk",
        brand="Fallback Pantry",
        calories_per_100g=83,
        protein_g=3.4,
        carbs_g=10.3,
        fat_g=1.9,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="open_food_facts",
        source_item_id="off-local-protein-bar",
        name="Protein Bar",
        brand="Fallback Pantry",
        calories_per_100g=368,
        protein_g=32.0,
        carbs_g=34.0,
        fat_g=12.0,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="open_food_facts",
        source_item_id="off-local-yogurt-drink",
        name="Yogurt Drink",
        brand="Fallback Pantry",
        calories_per_100g=72,
        protein_g=3.5,
        carbs_g=11.0,
        fat_g=1.5,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="open_food_facts",
        source_item_id="off-local-sports-drink",
        name="Sports Drink",
        brand="Fallback Pantry",
        calories_per_100g=25,
        protein_g=0.0,
        carbs_g=6.0,
        fat_g=0.0,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="open_food_facts",
        source_item_id="off-local-recovery-shake",
        name="Recovery Shake",
        brand="Fallback Pantry",
        calories_per_100g=80,
        protein_g=6.0,
        carbs_g=10.0,
        fat_g=1.5,
        local_fallback=True,
    ),
    build_catalog_entry(
        nutrition_source="open_food_facts",
        source_item_id="off-local-granola-bar",
        name="Granola Bar",
        brand="Fallback Pantry",
        calories_per_100g=471,
        protein_g=8.7,
        carbs_g=64.0,
        fat_g=20.0,
        local_fallback=True,
    ),
]


def normalize_text(value: str) -> str:
    return (
        str(value or "")
        .lower()
        .replace("&", " ")
        .replace("/", " ")
        .replace("-", " ")
        .replace(",", " ")
        .replace("(", " ")
        .replace(")", " ")
        .strip()
    )


def tokenize(value: str) -> list[str]:
    return [token for token in normalize_text(value).split() if len(token) >= 3]


def get_source_label(source: str) -> str:
    return NUTRITION_SOURCE_LABELS.get(source, source.title())


def infer_food_type(value: str, default: str = FOOD_TYPE_BASE) -> str:
    normalized = normalize_text(value)
    if any(term in normalized for term in PACKAGED_QUERY_TERMS):
        return FOOD_TYPE_PACKAGED
    if any(term in normalized for term in MIXED_DISH_TERMS):
        return FOOD_TYPE_MIXED
    return default


def preferred_source_for_food_type(food_type: str) -> str:
    if food_type == FOOD_TYPE_PACKAGED:
        return "open_food_facts"
    return "usda"


def score_candidate_match(query: str, candidate: dict) -> float:
    query_normalized = normalize_text(query)
    candidate_text = normalize_text(f"{candidate.get('name', '')} {candidate.get('brand', '')}")
    query_tokens = set(tokenize(query_normalized))
    candidate_tokens = set(tokenize(candidate_text))

    if not query_tokens or not candidate_tokens:
        return 0.0

    shared_tokens = query_tokens & candidate_tokens
    if not shared_tokens:
        return 0.0

    overlap_score = len(shared_tokens) / len(query_tokens)
    phrase_bonus = 0.45 if query_normalized and query_normalized in candidate_text else 0.0
    prefix_bonus = 0.15 if any(
        candidate_token.startswith(query_token)
        for query_token in query_tokens
        for candidate_token in candidate_tokens
    ) else 0.0
    brand_bonus = 0.1 if candidate.get("brand") and normalize_text(candidate["brand"]) in query_normalized else 0.0
    return round(overlap_score + phrase_bonus + prefix_bonus + brand_bonus, 3)


def confidence_from_score(score: float) -> str:
    if score >= 1.1:
        return "high"
    if score >= 0.65:
        return "medium"
    return "low"


def dedupe_results(results: Iterable[dict]) -> list[dict]:
    deduped: dict[tuple[str, str], dict] = {}
    for item in results:
        key = (item["nutrition_source"], item["source_item_id"])
        current = deduped.get(key)
        if current is None or item.get("match_score", 0) > current.get("match_score", 0):
            deduped[key] = item
    return list(deduped.values())


def rank_food_search_results(
    query: str,
    results: Iterable[dict],
    *,
    preferred_source: str | None = None,
    food_type: str | None = None,
    limit: int = 12,
) -> list[dict]:
    inferred_food_type = food_type or infer_food_type(query)
    preferred = preferred_source or preferred_source_for_food_type(inferred_food_type)
    ranked = []
    for item in dedupe_results(results):
        base_score = score_candidate_match(query, item)
        if base_score <= 0:
            continue
        source_bonus = 0.2 if item["nutrition_source"] == preferred else 0.0
        ranked.append(
            {
                **item,
                "match_score": round(base_score + source_bonus, 3),
                "match_confidence": confidence_from_score(base_score + source_bonus),
            }
        )

    ranked.sort(key=lambda item: (item["match_score"], item["protein_g"]), reverse=True)
    return ranked[:limit]


def search_local_catalog(query: str, catalog: Iterable[dict], *, preferred_source: str | None = None, limit: int = 12) -> list[dict]:
    return rank_food_search_results(
        query,
        catalog,
        preferred_source=preferred_source,
        food_type=infer_food_type(query),
        limit=limit,
    )


def nutrient_value_by_identifier(
    nutrients: Iterable[dict],
    *,
    ids: Iterable[str] = (),
    numbers: Iterable[str] = (),
) -> float | None:
    valid_ids = {str(value).strip() for value in ids}
    valid_numbers = {str(value).strip() for value in numbers}

    for nutrient in nutrients:
        nested_nutrient = nutrient.get("nutrient") if isinstance(nutrient.get("nutrient"), dict) else {}
        nutrient_id = str(
            nutrient.get("nutrientId") or nutrient.get("id") or nested_nutrient.get("id") or ""
        ).strip()
        nutrient_number = str(
            nutrient.get("nutrientNumber") or nutrient.get("number") or nested_nutrient.get("number") or ""
        ).strip()
        value = nutrient.get("value")
        if value is None:
            value = nutrient.get("amount")
        if value is None:
            continue

        if (valid_ids and nutrient_id in valid_ids) or (valid_numbers and nutrient_number in valid_numbers):
            return float(value)
    return None


def normalize_usda_food(food: dict) -> dict | None:
    name = str(food.get("description") or food.get("lowercaseDescription") or "").strip()
    if not name:
        return None

    nutrients = food.get("foodNutrients") or []
    calories = nutrient_value_by_identifier(nutrients, **USDA_NUTRIENT_MAP["calories_per_100g"])
    protein = nutrient_value_by_identifier(nutrients, **USDA_NUTRIENT_MAP["protein_g"])
    fat = nutrient_value_by_identifier(nutrients, **USDA_NUTRIENT_MAP["fat_g"])
    carbs = nutrient_value_by_identifier(nutrients, **USDA_NUTRIENT_MAP["carbs_g"])
    if calories is None or protein is None or fat is None or carbs is None:
        return None

    return build_catalog_entry(
        nutrition_source="usda",
        source_item_id=str(food.get("fdcId") or food.get("fdc_id") or name.lower().replace(" ", "-")),
        name=name,
        brand=str(food.get("brandName") or food.get("brandOwner") or "").strip(),
        calories_per_100g=calories,
        protein_g=protein,
        carbs_g=carbs,
        fat_g=fat,
    )


def normalize_off_product(product: dict) -> dict | None:
    nutriments = product.get("nutriments") or {}
    name = str(product.get("product_name") or product.get("generic_name") or "").strip()
    if not name:
        return None

    calories = nutriments.get("energy-kcal_100g") or nutriments.get("energy-kcal")
    protein = nutriments.get("proteins_100g")
    carbs = nutriments.get("carbohydrates_100g")
    fat = nutriments.get("fat_100g")
    if calories is None or protein is None or carbs is None or fat is None:
        return None

    return build_catalog_entry(
        nutrition_source="open_food_facts",
        source_item_id=str(product.get("_id") or product.get("code") or name.lower().replace(" ", "-")),
        name=name,
        brand=str(product.get("brands", "")).strip(),
        image_url=str(product.get("image_front_small_url") or product.get("image_url") or ""),
        calories_per_100g=float(calories),
        protein_g=float(protein),
        carbs_g=float(carbs),
        fat_g=float(fat),
    )


def search_usda_foods(query: str, *, limit: int = 10) -> list[dict]:
    api_key = getattr(settings, "USDA_API_KEY", "").strip()
    if not api_key:
        return with_fallback_reason(
            search_local_catalog(query, LOCAL_USDA_FOODS, preferred_source="usda", limit=limit),
            "missing_api_key",
        )

    try:
        response = requests.post(
            f"{settings.USDA_API_BASE_URL.rstrip('/')}/foods/search",
            params={"api_key": api_key},
            json={
                "query": query,
                "pageSize": limit,
                "dataType": ["Foundation", "SR Legacy", "Survey (FNDDS)"],
            },
            timeout=8,
        )
        response.raise_for_status()
        foods = response.json().get("foods", [])
    except requests.RequestException as exc:
        fallback_reason = "request_failed"
        if getattr(exc, "response", None) is not None:
            if exc.response.status_code == 403:
                fallback_reason = "invalid_api_key"
            else:
                fallback_reason = f"http_{exc.response.status_code}"
        return with_fallback_reason(
            search_local_catalog(query, LOCAL_USDA_FOODS, preferred_source="usda", limit=limit),
            fallback_reason,
        )

    normalized = [item for item in (normalize_usda_food(food) for food in foods) if item]
    if not normalized:
        return with_fallback_reason(
            search_local_catalog(query, LOCAL_USDA_FOODS, preferred_source="usda", limit=limit),
            "no_live_match",
        )
    return normalized


def search_open_food_facts(query: str, *, preference: str = "balanced", limit: int = 10) -> list[dict]:
    _ = preference
    try:
        response = requests.get(
            f"{settings.OPEN_FOOD_FACTS_BASE_URL.rstrip('/')}/cgi/search.pl",
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
    except requests.RequestException as exc:
        fallback_reason = "request_failed"
        if getattr(exc, "response", None) is not None:
            fallback_reason = f"http_{exc.response.status_code}"
        return with_fallback_reason(
            search_local_catalog(query, LOCAL_PACKAGED_FOODS, preferred_source="open_food_facts", limit=limit),
            fallback_reason,
        )

    normalized = [item for item in (normalize_off_product(product) for product in products) if item]
    if not normalized:
        return with_fallback_reason(
            search_local_catalog(query, LOCAL_PACKAGED_FOODS, preferred_source="open_food_facts", limit=limit),
            "no_live_match",
        )
    return normalized


def search_food_catalog(
    query: str,
    *,
    preference: str = "balanced",
    limit: int = 12,
    preferred_source: str | None = None,
    food_type: str | None = None,
) -> list[dict]:
    inferred_food_type = food_type or infer_food_type(query)
    preferred = preferred_source or preferred_source_for_food_type(inferred_food_type)
    usda_results = search_usda_foods(query, limit=max(limit, 8))
    off_results = search_open_food_facts(query, preference=preference, limit=max(limit, 8))
    ranked = rank_food_search_results(
        query,
        [*usda_results, *off_results],
        preferred_source=preferred,
        food_type=inferred_food_type,
        limit=limit,
    )
    return ranked
