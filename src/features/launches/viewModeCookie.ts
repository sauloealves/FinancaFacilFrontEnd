import { USER_STORAGE_KEY } from "../../contexts/auth/authStorage";
import type { LaunchViewMode } from "./types";

const LAUNCHES_VIEW_COOKIE_KEY = "financa-facil-launches-view";
const LAUNCHES_VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const DEFAULT_VIEW_MODE: LaunchViewMode = "grouped";

type StoredAuthUser = {
  id?: string;
  email?: string;
};

function isLaunchViewMode(value: string | null | undefined): value is LaunchViewMode {
  return value === "grouped" || value === "spreadsheet";
}

function getCookieValue(cookieKey: string, cookieSource: string) {
  const cookiePattern = new RegExp(`(?:^|; )${cookieKey}=([^;]+)`);
  const match = cookiePattern.exec(cookieSource);

  return match ? decodeURIComponent(match[1]) : null;
}

function getStoredUserIdentity() {
  if (globalThis.window === undefined) {
    return null;
  }

  const storedUser = globalThis.localStorage.getItem(USER_STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(storedUser) as StoredAuthUser;
    return parsedUser.id || parsedUser.email || null;
  } catch {
    return null;
  }
}

function getCookieKey(userIdentity?: string | null) {
  if (!userIdentity) {
    return LAUNCHES_VIEW_COOKIE_KEY;
  }

  return `${LAUNCHES_VIEW_COOKIE_KEY}-${encodeURIComponent(userIdentity)}`;
}

export function resolveStoredLaunchViewMode(userIdentity?: string | null): LaunchViewMode {
  if (typeof document === "undefined") {
    return DEFAULT_VIEW_MODE;
  }

  const resolvedIdentity = userIdentity ?? getStoredUserIdentity();
  const scopedCookieValue = getCookieValue(getCookieKey(resolvedIdentity), document.cookie);

  if (isLaunchViewMode(scopedCookieValue)) {
    return scopedCookieValue;
  }

  const sharedCookieValue = getCookieValue(LAUNCHES_VIEW_COOKIE_KEY, document.cookie);
  return isLaunchViewMode(sharedCookieValue) ? sharedCookieValue : DEFAULT_VIEW_MODE;
}

export function persistLaunchViewMode(viewMode: LaunchViewMode, userIdentity?: string | null) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${getCookieKey(userIdentity)}=${encodeURIComponent(viewMode)}; path=/; max-age=${LAUNCHES_VIEW_COOKIE_MAX_AGE}; SameSite=Lax`;
}