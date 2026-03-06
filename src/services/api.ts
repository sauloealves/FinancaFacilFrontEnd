import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const baseURL = (apiBaseUrl && apiBaseUrl.length > 0 ? apiBaseUrl : "https://localhost:7290/api").replace(/\/+$/, "");

const api = axios.create({
  baseURL,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;