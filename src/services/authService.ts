import api from "./api";

export type AuthUserPayload = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  notificationsEnabled?: boolean;
  notificationChannels?: {
    whatsapp?: boolean;
    email?: boolean;
  };
};

type AuthPayload = {
  token: string;
  user: AuthUserPayload;
};

const DEFAULT_CHANGE_PASSWORD_ENDPOINT = (
  (import.meta.env.VITE_CHANGE_PASSWORD_ENDPOINT as string | undefined)?.trim() ||
  "/auth/change-password"
).replace(/\/+$/, "");

export async function register(data: {
  name: string;
  email: string;
  password: string;
}) {
  const { data: response } = await api.post<AuthPayload>("/auth/register", data);
  return response;
}

export async function login(data: {
  email: string;
  password: string;
}) {
  const { data: response } = await api.post<AuthPayload>("/auth/login", data);
  return response;
}

export async function forgotPassword(email: string) {
  const { data } = await api.post<unknown>("/auth/forgot-password", { email });
  return data;
}

export async function resetPassword(token: string, newPassword: string) {
  const { data } = await api.post<unknown>("/auth/reset-password", { token, newPassword });
  return data;
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const { data: response } = await api.post<unknown>(DEFAULT_CHANGE_PASSWORD_ENDPOINT, data);
  return response;
}