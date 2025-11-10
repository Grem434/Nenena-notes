// apps/web/src/lib/uiBeeps.js
const cache = {};
function play(src) {
  try {
    (cache[src] ||= new Audio(src)).cloneNode().play().catch(() => {});
  } catch {}
}

// iOS usa dictado del teclado y ya mete sonidos propios
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// Usa tus archivos del /public
const BEEP_START_SRC = "/sounds/beep-start.mp3";
const BEEP_END_SRC   = "/sounds/beep-end.mp3";

export const playStartBeep = () => play(BEEP_START_SRC);
export const playEndBeep   = () => play(BEEP_END_SRC);
