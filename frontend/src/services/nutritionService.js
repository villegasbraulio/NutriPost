import apiClient from "../api/client";

export const nutritionService = {
  async getRecommendation(activityLogId) {
    const { data } = await apiClient.get(`/nutrition/recommendations/${activityLogId}/`);
    return data;
  },
  async parseMeal(description) {
    const { data } = await apiClient.post("/nutrition/parse-meal/", { description });
    return data;
  },
  async searchFoods(query, category = "balanced") {
    const { data } = await apiClient.get("/nutrition/foods/search/", {
      params: { q: query, category },
    });
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
