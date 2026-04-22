import apiClient from "../api/client";

export const routineService = {
  async getRoutines() {
    const { data } = await apiClient.get("/routines/");
    return data;
  },
  async getRoutine(id) {
    const { data } = await apiClient.get(`/routines/${id}/`);
    return data;
  },
  async createRoutine(values) {
    const { data } = await apiClient.post("/routines/", values);
    return data;
  },
  async updateRoutine(id, values) {
    const { data } = await apiClient.put(`/routines/${id}/`, values);
    return data;
  },
  async deleteRoutine(id) {
    const { data } = await apiClient.delete(`/routines/${id}/`);
    return data;
  },
  async analyzeRoutine(id) {
    const { data } = await apiClient.post(`/routines/${id}/analyze/`);
    return data;
  },
  async parseRoutine(rawText) {
    const { data } = await apiClient.post("/routines/parse-text/", { raw_text: rawText });
    return data;
  },
  async parseRoutineFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post("/routines/parse-file/", formData);
    return data;
  },
};
