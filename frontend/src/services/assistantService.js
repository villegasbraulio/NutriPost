import apiClient from "../api/client";

export const assistantService = {
  async getChatState() {
    const { data } = await apiClient.get("/assistant/chat/");
    return data;
  },
  async sendMessage(message) {
    const { data } = await apiClient.post("/assistant/chat/", { message });
    return data;
  },
};
