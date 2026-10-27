
import React from "react";
import useTheme from "../hooks/useTheme";

export default function ThemeToggle({ className = "" }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={
        isDark
          ? "Switch to light theme"
          : "Switch to dark theme"
      }
      aria-pressed={isDark}
      title={
        isDark
          ? "Switch to Light Mode"
          : "Switch to Dark Mode"
      }
    >
      <span aria-hidden="true">
        {isDark ? "☀️" : "🌙"}
      </span>

      
    </button>
  );
}
