"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import "./theme-toggle.css";

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Wait for component to mount to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="theme-toggle-loading">
        <div className="theme-toggle-loading-bg" />
      </div>
    );
  }

  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <label htmlFor="theme-switch" className="theme-switch">
      <input
        id="theme-switch"
        type="checkbox"
        checked={isDark}
        onChange={toggleTheme}
        aria-label="Toggle theme"
      />
      <span className="theme-slider" />
      <span className="theme-decoration" />
    </label>
  );
}