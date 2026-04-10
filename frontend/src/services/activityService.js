import apiClient from "../api/client";

export const activityService = {
  async getActivityTypes() {
    const { data } = await apiClient.get("/activities/types/");
    return data;
  },
  async getLogs(params = {}) {
    const { data } = await apiClient.get("/activities/logs/", { params });
    return data;
  },
  async createLog(values) {
    const { data } = await apiClient.post("/activities/logs/", values);
    return data;
  },
  async getLog(id) {
    const { data } = await apiClient.get(`/activities/logs/${id}/`);
    return data;
  },
  async deleteLog(id) {
    const { data } = await apiClient.delete(`/activities/logs/${id}/`);
    return data;
  },
};
