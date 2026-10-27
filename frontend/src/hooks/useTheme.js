import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "imunixTheme";

function readStoredTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/**
 * Light / dark theme for the staff dashboards (admin, clinic admin, worker).
 *
 * The chosen theme is remembered in localStorage and applied as
 * `data-theme` on <html> only while a dashboard is mounted, so every other
 * page (including the citizen area) keeps its normal light look.
 */
export default function useTheme() {
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);

    return () => {
      root.removeAttribute("data-theme");
    };
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";

      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage may be blocked; the theme still switches for this visit.
      }

      return next;
    });
  }, []);

  return { theme, isDark: theme === "dark", toggleTheme };
}
