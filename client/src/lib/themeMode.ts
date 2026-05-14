export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "cashpilot_theme";

const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const getStoredThemeMode = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }

  return "system";
};

export const applyThemeMode = (mode: ThemeMode) => {
  if (typeof document === "undefined") {
    return;
  }

  const resolved = mode === "system" ? getSystemTheme() : mode;
  const root = document.documentElement;

  root.classList.toggle("dark", resolved === "dark");
  root.setAttribute("data-theme", resolved);
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
};

export const initThemeMode = () => {
  applyThemeMode(getStoredThemeMode());
};
