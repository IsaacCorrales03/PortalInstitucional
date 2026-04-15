"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY_MODE  = "ctp-theme-mode";   // dark | light | system
const STORAGE_KEY_COLOR = "ctp-theme-color";  // neon | lava | forest | ocean | rose | ""

function getSystemTheme() {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(baseMode, colorName) {
  document.documentElement.setAttribute("data-theme", baseMode);
  const isCustom = colorName && !["dark", "light"].includes(colorName);
  if (isCustom) {
    document.documentElement.setAttribute("data-theme-color", colorName);
  } else {
    document.documentElement.removeAttribute("data-theme-color");
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === "undefined") return "system";
    return localStorage.getItem(STORAGE_KEY_MODE) ?? "system";
  });

  const [colorName, setColorNameState] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(STORAGE_KEY_COLOR) ?? "";
  });

  const resolved = theme === "system" ? getSystemTheme() : theme;

  // aplica ambos atributos cuando cambia theme o colorName
  useEffect(() => {
    const base = theme === "system" ? getSystemTheme() : theme;
    applyTheme(base, colorName);
  }, [theme, colorName]);

  // reacciona a cambios del sistema operativo
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(mq.matches ? "dark" : "light", colorName);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, colorName]);

  const setTheme = useCallback((next) => {
    localStorage.setItem(STORAGE_KEY_MODE, next);
    setThemeState(next);
  }, []);

  const setColorName = useCallback((next) => {
    localStorage.setItem(STORAGE_KEY_COLOR, next);
    setColorNameState(next);
  }, []);

  const cycleTheme = useCallback(() => {
    const modes = ["dark", "light", "system"];
    const idx = modes.indexOf(theme);
    setTheme(modes[(idx + 1) % modes.length]);
  }, [theme, setTheme]);

  const cycleColor = useCallback(() => {
    const colors = ["", "neon", "lava", "forest", "ocean", "rose"];
    const idx = colors.indexOf(colorName);
    setColorName(colors[(idx + 1) % colors.length]);
  }, [colorName, setColorName]);

  return {
    theme,       // dark | light | system
    resolved,    // dark | light (nunca system)
    colorName,   // "" | neon | lava | forest | ocean | rose
    setTheme,
    setColorName,
    cycleTheme,
    cycleColor,
  };
}