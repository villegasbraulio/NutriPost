import json
from types import SimpleNamespace

import pytest
import requests
from django.conf import settings

from apps.nutrition.catalog import normalize_usda_food, search_food_catalog, search_usda_foods
from apps.nutrition.services import parse_meal_from_text, resolve_parsed_meal_item


def raise_request_exception(*_args, **_kwargs):
    raise requests.RequestException("offline")


def test_search_food_catalog_prefers_usda_for_base_food_queries(monkeypatch):
    monkeypatch.setattr("apps.nutrition.catalog.requests.post", raise_request_exception)
    monkeypatch.setattr("apps.nutrition.catalog.requests.get", raise_request_exception)

    results = search_food_catalog("chicken breast", limit=5)

    assert results
    assert results[0]["nutrition_source"] == "usda"
    assert "Chicken Breast" in results[0]["name"]


def test_search_food_catalog_prefers_open_food_facts_for_packaged_queries(monkeypatch):
    monkeypatch.setattr("apps.nutrition.catalog.requests.post", raise_request_exception)
    monkeypatch.setattr("apps.nutrition.catalog.requests.get", raise_request_exception)

    results = search_food_catalog("chocolate milk", limit=5)

    assert results
    assert results[0]["nutrition_source"] == "open_food_facts"
    assert "Chocolate Milk" in results[0]["name"]


def test_normalize_usda_food_supports_live_food_search_nutrient_fields():
    normalized = normalize_usda_food(
        {
            "fdcId": 2705964,
            "description": "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
            "foodNutrients": [
                {"nutrientId": 1008, "nutrientNumber": "208", "value": 165.0},
                {"nutrientId": 1003, "nutrientNumber": "203", "value": 31.0},
                {"nutrientId": 1004, "nutrientNumber": "204", "value": 3.6},
                {"nutrientId": 1005, "nutrientNumber": "205", "value": 0.0},
            ],
        }
    )

    assert normalized is not None
    assert normalized["source_item_id"] == "2705964"
    assert normalized["calories_per_100g"] == pytest.approx(165.0)
    assert normalized["protein_g"] == pytest.approx(31.0)


def test_search_usda_foods_returns_live_results_before_local_fallback(monkeypatch):
    class DummyResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "foods": [
                    {
                        "fdcId": 2705964,
                        "description": "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
                        "foodNutrients": [
                            {"nutrientId": 1008, "nutrientNumber": "208", "value": 165.0},
                            {"nutrientId": 1003, "nutrientNumber": "203", "value": 31.0},
                            {"nutrientId": 1004, "nutrientNumber": "204", "value": 3.6},
                            {"nutrientId": 1005, "nutrientNumber": "205", "value": 0.0},
                        ],
                    }
                ]
            }

    monkeypatch.setattr(settings, "USDA_API_KEY", "test-key", raising=False)
    monkeypatch.setattr("apps.nutrition.catalog.requests.post", lambda *_args, **_kwargs: DummyResponse())

    results = search_usda_foods("chicken breast", limit=3)

    assert results
    assert results[0]["source_item_id"] == "2705964"
    assert results[0]["nutrition_source"] == "usda"
    assert results[0]["source_metadata"]["local_fallback"] is False


def test_resolve_parsed_meal_item_uses_usda_for_base_foods(monkeypatch):
    monkeypatch.setattr(settings, "USDA_API_KEY", "test-key", raising=False)
    monkeypatch.setattr("apps.nutrition.catalog.requests.post", raise_request_exception)
    monkeypatch.setattr("apps.nutrition.catalog.requests.get", raise_request_exception)

    resolved = resolve_parsed_meal_item(
        {
            "food_name": "Chicken breast",
            "estimated_quantity_g": 200,
            "calories": 260,
            "protein_g": 53,
            "carbs_g": 0,
            "fat_g": 4,
            "confidence": "high",
            "food_type": "base_food",
            "search_query": "chicken breast",
        }
    )

    assert resolved["nutrition_source"] == "usda"
    assert resolved["source_name"].startswith("Chicken Breast")
    assert resolved["calories"] == pytest.approx(330.0)
    assert resolved["protein_g"] == pytest.approx(62.0)
    assert resolved["source_metadata"]["local_fallback"] is True
    assert resolved["source_metadata"]["fallback_reason"] == "request_failed"


def test_resolve_parsed_meal_item_keeps_ai_estimate_for_mixed_dishes(monkeypatch):
    monkeypatch.setattr("apps.nutrition.catalog.requests.post", raise_request_exception)
    monkeypatch.setattr("apps.nutrition.catalog.requests.get", raise_request_exception)

    resolved = resolve_parsed_meal_item(
        {
            "food_name": "Chicken rice bowl",
            "estimated_quantity_g": 350,
            "calories": 540,
            "protein_g": 34,
            "carbs_g": 58,
            "fat_g": 14,
            "confidence": "medium",
            "food_type": "mixed_dish",
            "search_query": "chicken rice bowl",
        }
    )

    assert resolved["nutrition_source"] == "ai"
    assert resolved["calories"] == pytest.approx(540.0)
    assert resolved["source_name"] == "Chicken rice bowl"


def test_parse_meal_from_text_returns_resolved_sources(monkeypatch):
    monkeypatch.setattr("apps.nutrition.catalog.requests.post", raise_request_exception)
    monkeypatch.setattr("apps.nutrition.catalog.requests.get", raise_request_exception)

    payload = [
        {
            "food_name": "Chicken breast",
            "food_type": "base_food",
            "estimated_quantity_g": 200,
            "calories": 260,
            "protein_g": 53,
            "carbs_g": 0,
            "fat_g": 4,
            "confidence": "high",
            "search_query": "chicken breast",
        },
        {
            "food_name": "Chocolate milk",
            "food_type": "packaged_product",
            "estimated_quantity_g": 200,
            "calories": 166,
            "protein_g": 6.8,
            "carbs_g": 20.6,
            "fat_g": 3.8,
            "confidence": "high",
            "search_query": "chocolate milk",
        },
    ]

    dummy_model = SimpleNamespace(
        generate_content=lambda _prompt: SimpleNamespace(text=json.dumps(payload))
    )
    monkeypatch.setattr("apps.nutrition.services.get_model", lambda temperature=0.1: dummy_model)

    parsed = parse_meal_from_text("I had chicken breast and chocolate milk")

    assert len(parsed["items"]) == 2
    assert parsed["items"][0]["nutrition_source"] == "usda"
    assert parsed["items"][1]["nutrition_source"] == "open_food_facts"
    assert parsed["total_calories"] == pytest.approx(496.0)
