import axios from "axios";

function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const defaultBaseUrl = "http://127.0.0.1:8000/api/v1";

  if (import.meta.env.DEV) {
    return "/api/v1";
  }

  return configuredBaseUrl || defaultBaseUrl;
}

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
});

let isRefreshing = false;
let queuedRequests = [];

const flushQueue = (error) => {
  queuedRequests.forEach((callback) => callback(error));
  queuedRequests = [];
};

function logApiError(error) {
  const config = error.config || {};
  const method = (config.method || "GET").toUpperCase();
  const url = `${config.baseURL || ""}${config.url || ""}`;
  const status = error.response?.status || "network";
  const payload = error.response?.data;

  console.groupCollapsed(`[NutriPost API Error] ${method} ${url} -> ${status}`);
  console.error("Axios error:", error);
  console.info("Request:", {
    method,
    url,
    params: config.params,
    data: config.data,
  });
  console.info("Response:", {
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: payload,
  });
  console.groupEnd();
}

apiClient.interceptors.request.use((config) => ({
  ...config,
  withCredentials: true,
  headers: {
    ...config.headers,
    "X-Requested-With": "XMLHttpRequest",
  },
}));

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (
      status !== 401 ||
      originalRequest?._retry ||
      originalRequest?.url?.includes("/auth/refresh/")
    ) {
      logApiError(error);
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queuedRequests.push((refreshError) => {
          if (refreshError) {
            reject(refreshError);
            return;
          }
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;
    try {
      await apiClient.post("/auth/refresh/");
      flushQueue(null);
      return apiClient(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError);
      window.dispatchEvent(new Event("auth:expired"));
      logApiError(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
