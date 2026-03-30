export const TOKEN_STORAGE_KEY = "token";
export const USER_STORAGE_KEY = "auth_user";

function normalizeToken(token: string | null | undefined): string | null {
  if (!token) {
    return null;
  }

  const trimmedToken = token.trim();
  return trimmedToken.length > 0 ? trimmedToken : null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    return null;
  }

  try {
    const base64 = tokenParts[1].replaceAll("-", "+").replaceAll("_", "/");
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decodedPayload = globalThis.atob(paddedBase64);
    return JSON.parse(decodedPayload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isExpiredJwtToken(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return false;
  }

  const expiration = payload.exp;
  if (typeof expiration !== "number") {
    return false;
  }

  return Date.now() >= expiration * 1000;
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function getStoredToken(): string | null {
  const token = normalizeToken(localStorage.getItem(TOKEN_STORAGE_KEY));
  if (!token || isExpiredJwtToken(token)) {
    if (localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(USER_STORAGE_KEY)) {
      clearStoredAuth();
    }

    return null;
  }

  return token;
}

export function persistToken(token: string | null) {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, normalizedToken);
}

export function hasStoredToken(): boolean {
  return getStoredToken() !== null;
}