import axios from "axios";
import { getStoredToken } from "../contexts/auth/authStorage";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const baseURL = (apiBaseUrl && apiBaseUrl.length > 0 ? apiBaseUrl : "http://localhost:32772/api").replace(/\/+$/, "");

type ApiSuccessResponse<T> = {
  success: true;
  data?: T;
  error?: string | null;
};

type ApiErrorResponse = {
  success: false;
  error: string | null;
};

type ApiEnvelope<T> = ApiSuccessResponse<T> | ApiErrorResponse;

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return typeof value === "object"
    && value !== null
    && "success" in value
    && typeof (value as { success?: unknown }).success === "boolean";
}

function buildApiError(message: string, response?: unknown) {
  const error = new Error(message) as Error & { response?: unknown };
  error.response = response;
  return error;
}

function getMessageFromResponseData(responseData: unknown): string | null {
  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (!responseData || typeof responseData !== "object") {
    return null;
  }

  const apiError = (responseData as { error?: unknown }).error;
  if (typeof apiError === "string" && apiError.trim()) {
    return apiError;
  }

  const message = (responseData as { message?: unknown }).message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return null;
}

function unwrapApiResponse<T>(payload: unknown): T {
  if (!isApiEnvelope(payload)) {
    return payload as T;
  }

  if (!payload.success) {
    throw buildApiError(payload.error || "Erro ao processar requisição.", {
      data: payload,
    });
  }

  return payload.data as T;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseMessage = getMessageFromResponseData(error.response?.data);
    if (responseMessage) {
      return responseMessage;
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

const api = axios.create({
  baseURL,
});

api.interceptors.request.use(config => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  response => {
    response.data = unwrapApiResponse(response.data);
    return response;
  },
  error => {
    if (axios.isAxiosError(error) && error.response) {
      const responseData = error.response.data;

      if (isApiEnvelope(responseData) && !responseData.success) {
        error.message = responseData.error || error.message;
      }
    }

    return Promise.reject(error);
  }
);

export default api;