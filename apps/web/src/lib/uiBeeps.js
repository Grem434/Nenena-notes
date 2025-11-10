// apps/web/src/lib/uiBeeps.js
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

const cache = {};
function get(src) {
  if (!cache[src]) {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = 0.7; // sutil, ajusta si quieres
    cache[src] = a;
  }
  return cache[src].cloneNode(); // evita bloquear el mismo elemento
}

function playSafe(src) {
  try {
    get(src).play().catch((e) => {
      // Log útil para diagnosticar si no suena
      console.debug("[uiBeeps] play error", src, e?.message || e);
    });
  } catch (e) {
    console.debug("[uiBeeps] play exception", src, e?.message || e);
  }
}

// Usa tus archivos desplegados en /public/sounds
const BEEP_START_SRC = "/sounds/beep-start.mp3";
const BEEP_END_SRC   = "/sounds/beep-end.mp3";

export const playStartBeep = () => playSafe(BEEP_START_SRC);
export const playEndBeep   = () => playSafe(BEEP_END_SRC);

// Utilidad: test desde consola -> window.__testBeeps()
if (typeof window !== "undefined") {
  window.__testBeeps = () => {
    console.log("→ Probando beeps…");
    playStartBeep();
    setTimeout(() => playEndBeep(), 600);
  };
}
