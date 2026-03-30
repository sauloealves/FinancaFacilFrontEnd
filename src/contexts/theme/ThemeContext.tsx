import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const THEME_COOKIE_KEY = "financa-facil-theme";
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const DEFAULT_THEME: ThemeMode = "light";

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "light" || value === "dark";
}

function getCookieTheme(cookieSource: string): ThemeMode | null {
  const cookiePattern = new RegExp(`(?:^|; )${THEME_COOKIE_KEY}=([^;]+)`);
  const match = cookiePattern.exec(cookieSource);
  if (!match) {
    return null;
  }

  const decodedValue = decodeURIComponent(match[1]);
  return isThemeMode(decodedValue) ? decodedValue : null;
}

function resolveInitialTheme(): ThemeMode {
  if (typeof document === "undefined") {
    return DEFAULT_THEME;
  }

  const datasetTheme = document.documentElement.dataset.theme;
  if (isThemeMode(datasetTheme)) {
    return datasetTheme;
  }

  return getCookieTheme(document.cookie) ?? DEFAULT_THEME;
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function persistTheme(theme: ThemeMode) {
  document.cookie = `${THEME_COOKIE_KEY}=${encodeURIComponent(theme)}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [theme, setTheme] = useState<ThemeMode>(resolveInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => {
        setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
      },
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}