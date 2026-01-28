import api from "./api";

export const register = (data: {
  name: string;
  email: string;
  password: string;
}) => api.post("/auth/register", data);

export const login = (data: {
  email: string;
  password: string;
}) => api.post("/auth/login", data);

export const forgotPassword = (email: string) =>
  api.post("/auth/forgot-password", { email });

export const resetPassword = (token: string, newPassword: string) =>
  api.post("/auth/reset-password", { token, newPassword });