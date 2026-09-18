import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
  initTheme: () => void;
}

const THEME_STORAGE_KEY = "satquery_theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeToDocument(theme: ThemeMode): "light" | "dark" {
  if (typeof window === "undefined") return "dark";

  const resolved = theme === "system" ? getSystemTheme() : theme;

  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }

  return resolved;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // Deterministic safe initial state during SSR and initial client pass
  theme: "dark",
  resolvedTheme: "dark",

  setTheme: (mode: ThemeMode) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
      }
    } catch (e) {}

    const resolved = applyThemeToDocument(mode);
    set({ theme: mode, resolvedTheme: resolved });
  },

  initTheme: () => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      const initialTheme = (stored === "light" || stored === "dark" || stored === "system") ? stored : "dark";
      const resolved = applyThemeToDocument(initialTheme);
      set({ theme: initialTheme, resolvedTheme: resolved });

      // Listen for OS system theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        if (get().theme === "system") {
          const nextResolved = applyThemeToDocument("system");
          set({ resolvedTheme: nextResolved });
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handleChange);
      } else {
        mediaQuery.addListener(handleChange);
      }
    } catch (e) {
      const resolved = getSystemTheme();
      set({ theme: "dark", resolvedTheme: applyThemeToDocument("dark") });
    }
  },
}));
