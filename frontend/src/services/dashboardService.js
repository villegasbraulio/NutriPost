import apiClient from "../api/client";

export const dashboardService = {
  async getSummary(period = "7d") {
    const { data } = await apiClient.get("/dashboard/summary/", { params: { period } });
    return data;
  },
  async getStreak() {
    const { data } = await apiClient.get("/dashboard/streak/");
    return data;
  },
  async getProgress() {
    const { data } = await apiClient.get("/dashboard/progress/");
    return data;
  },
  async getInsight() {
    const { data } = await apiClient.get("/dashboard/insights/");
    return data;
  },
  async getNotifications(params = {}) {
    const { data } = await apiClient.get("/dashboard/notifications/", { params });
    return data;
  },
  async dismissNotification(id) {
    const { data } = await apiClient.post(`/dashboard/notifications/${id}/dismiss/`);
    return data;
  },
};
