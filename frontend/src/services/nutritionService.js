import apiClient from "../api/client";

function asItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
}

function summarizeNutritionItem(item) {
  return {
    name: item?.food_name || item?.name || item?.source_name || "Unknown item",
    source: item?.nutrition_source_label || item?.nutrition_source || "unknown",
    sourceItemId: item?.source_item_id || item?.id || "",
    query: item?.source_metadata?.search_query || item?.search_query || "",
    fallbackReason: item?.source_metadata?.fallback_reason || "",
  };
}

function logNutritionResolution(context, payload, metadata = {}) {
  const items = asItems(payload);
  const fallbackItems = items.filter((item) => item?.source_metadata?.local_fallback);
  const aiEstimatedItems = items.filter((item) => item?.nutrition_source === "ai");

  if (fallbackItems.length) {
    console.warn("[NutriPost Nutricion] Respuesta con fallback detectada", {
      context,
      ...metadata,
      items: fallbackItems.map(summarizeNutritionItem),
    });
  }

  if (aiEstimatedItems.length) {
    console.info("[NutriPost Nutricion] Items resueltos con estimacion AI", {
      context,
      ...metadata,
      items: aiEstimatedItems.map(summarizeNutritionItem),
    });
  }
}

export const nutritionService = {
  async getRecommendation(activityLogId) {
    const { data } = await apiClient.get(`/nutrition/recommendations/${activityLogId}/`);
    return data;
  },
  async parseMeal(description) {
    const { data } = await apiClient.post("/nutrition/parse-meal/", { description });
    logNutritionResolution("parseMeal", data, { description });
    return data;
  },
  async searchFoods(query, category = "balanced") {
    const { data } = await apiClient.get("/nutrition/foods/search/", {
      params: { q: query, category },
    });
    logNutritionResolution("searchFoods", data, { query, category });
    return data;
  },
  async createFoodLog(values) {
    const { data } = await apiClient.post("/nutrition/food-logs/", values);
    return data;
  },
  async getFoodLogs(params = {}) {
    const { data } = await apiClient.get("/nutrition/food-logs/", { params });
    return data;
  },
};
