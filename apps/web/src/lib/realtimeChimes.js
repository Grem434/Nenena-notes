// apps/web/src/lib/realtimeChimes.js
// Hace sonar chimes SOLO en dispositivos remotos (evita el eco local).

const recentLocalOps = new Map(); // noteId -> timeoutId
const TTL_MS = 6000; // ventana para considerar "eco" local

export function markLocalNoteTouch(noteId) {
  if (!noteId) return;
  clearTimeout(recentLocalOps.get(noteId));
  const t = setTimeout(() => recentLocalOps.delete(noteId), TTL_MS);
  recentLocalOps.set(noteId, t);
}

export function shouldPlayIncomingChime(noteId) {
  // Si esta id fue “tocada” en este cliente hace poco, NO sonamos.
  return !recentLocalOps.has(noteId);
}

// ---- Sonidos (placeholders). Si ya tienes tu reproductor de sonidos, usa ese.
const cache = {};
function play(src) {
  try {
    (cache[src] ||= new Audio(src)).cloneNode().play().catch(() => {});
  } catch {}
}

const CHIMES = {
  created: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAAABAAAA",
  updated: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAAABAAAA",
  deleted: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAAABAAAA",
};

export function playNoteChime(kind = "updated") {
  play(CHIMES[kind] || CHIMES.updated);
}
