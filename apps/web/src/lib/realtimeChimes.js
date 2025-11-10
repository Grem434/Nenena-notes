// apps/web/src/lib/realtimeChimes.js
const SHARED_KEY = "__nenenaRealtimeChimes__";
const shared = (globalThis[SHARED_KEY] ??= {
  recentLocalOps: new Map(), // noteId -> timeoutId
  cache: {},
  TTL_MS: 6000,
});

function get(src) {
  if (!shared.cache[src]) {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = 0.6;
    shared.cache[src] = a;
  }
  return shared.cache[src].cloneNode();
}

function play(src) {
  try {
    get(src).play().catch((e) => {
      console.debug("[chimes] play error", src, e?.message || e);
    });
  } catch (e) {
    console.debug("[chimes] play exception", src, e?.message || e);
  }
}

/** Marca operación local para evitar eco en este cliente. */
export function markLocalNoteTouch(noteId) {
  if (!noteId) return;
  const { recentLocalOps, TTL_MS } = shared;
  clearTimeout(recentLocalOps.get(noteId));
  const t = setTimeout(() => recentLocalOps.delete(noteId), TTL_MS);
  recentLocalOps.set(noteId, t);
}

/** true si debemos sonar (no es eco local reciente). */
export function shouldPlayIncomingChime(noteId) {
  return !shared.recentLocalOps.has(noteId);
}

// Define aquí tus archivos (apúntalos al mismo si sólo tienes uno)
const CHIMES = {
  created: "/sounds/chime-created.mp3",
  updated: "/sounds/chime-updated.mp3",
  deleted: "/sounds/chime-deleted.mp3",
};

export function playNoteChime(kind = "updated") {
  const src = CHIMES[kind] || CHIMES.updated;
  // Log útil para ver que estamos intentando sonar y qué kind
  console.debug("[chimes] try", kind, src);
  play(src);
}

// Test desde consola -> window.__testChime('created'|'updated'|'deleted')
if (typeof window !== "undefined") {
  window.__testChime = (k = "updated") => playNoteChime(k);
}
