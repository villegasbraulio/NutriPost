import apiClient from "../api/client";

export const authService = {
  async login(values) {
    const { data } = await apiClient.post("/auth/login/", values);
    return data;
  },
  async register(values) {
    const { data } = await apiClient.post("/auth/register/", values);
    return data;
  },
  async logout() {
    const { data } = await apiClient.post("/auth/logout/");
    return data;
  },
  async getCurrentUser() {
    const { data } = await apiClient.get("/auth/me/");
    return data;
  },
  async updateProfile(values) {
    const { data } = await apiClient.put("/auth/me/", values);
    return data;
  },
};
