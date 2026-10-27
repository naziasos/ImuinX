
import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "imunixTheme";

const listeners = new Set();

function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

let preference = readStoredTheme();

function applyTheme() {
  if (typeof document === "undefined") return;

  document.documentElement.setAttribute(
    "data-theme",
    preference
  );

  document.documentElement.style.colorScheme = preference;
}

function setPreference(nextTheme) {
  if (nextTheme !== "light" && nextTheme !== "dark") {
    return;
  }

  if (preference === nextTheme) {
    applyTheme();
    return;
  }

  preference = nextTheme;

  try {
    localStorage.setItem(STORAGE_KEY, nextTheme);
  } catch {
    // Theme switching still works for this session.
  }

  applyTheme();

  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return preference;
}

function getServerSnapshot() {
  return "light";
}

// Apply saved theme immediately and synchronize other tabs.
if (typeof window !== "undefined") {
  applyTheme();

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      const nextTheme =
        event.newValue === "dark" ? "dark" : "light";

      setPreference(nextTheme);
    }
  });
}

export default function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const toggleTheme = useCallback(() => {
    setPreference(
      preference === "dark" ? "light" : "dark"
    );
  }, []);

  const changeTheme = useCallback((nextTheme) => {
    setPreference(nextTheme);
  }, []);

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    changeTheme,
  };
}
