// apps/web/src/store/useThemeStore.jsx
import { create } from "zustand";

const STORAGE_KEY = "nenena-theme"; // 'system' | 'light' | 'dark'

function applyTheme(theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", !!dark);
}

export const useThemeStore = create((set) => ({
  theme: (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) || "system",
  setTheme: (t) => {
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
    set({ theme: t });
    applyTheme(t);
  },
}));

// init + reaccionar a cambios del sistema si está en 'system'
if (typeof window !== "undefined") {
  const t = localStorage.getItem(STORAGE_KEY) || "system";
  applyTheme(t);
  const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
  mq?.addEventListener?.("change", () => {
    if (useThemeStore.getState().theme === "system") applyTheme("system");
  });
}
