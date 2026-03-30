import { hasStoredToken } from "../contexts/auth/authStorage";

export function isAuthenticated(): boolean {
  return hasStoredToken();
}