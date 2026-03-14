import api from "./api";

type AuthPayload = {
  token: string;
  user: {
    id: string;
    email: string;
  };
};

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