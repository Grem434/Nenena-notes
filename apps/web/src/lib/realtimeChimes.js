// apps/web/src/lib/realtimeChimes.js
// Idempotente: evita "Identifier ... has already been declared" en HMR/build.

const SHARED_KEY = "__nenenaRealtimeChimes__";
const shared =
  (globalThis[SHARED_KEY] ??= {
    recentLocalOps: new Map(), // noteId -> timeoutId
    cache: {},
    TTL_MS: 6000,
  });

function play(src) {
  try {
    (shared.cache[src] ||= new Audio(src)).cloneNode().play().catch(() => {});
  } catch {}
}

/** Marca una operación local para evitar el eco de sonido en este cliente. */
export function markLocalNoteTouch(noteId) {
  if (!noteId) return;
  const { recentLocalOps, TTL_MS } = shared;
  clearTimeout(recentLocalOps.get(noteId));
  const t = setTimeout(() => recentLocalOps.delete(noteId), TTL_MS);
  recentLocalOps.set(noteId, t);
}

/** Devuelve true si debemos sonar (no es eco local reciente). */
export function shouldPlayIncomingChime(noteId) {
  return !shared.recentLocalOps.has(noteId);
}

// Rutas de sonidos (si aún no tienes chimes, puedes apuntar los tres al mismo archivo)
const CHIMES = {
  created: "/sounds/chime-created.mp3",
  updated: "/sounds/chime-updated.mp3",
  deleted: "/sounds/chime-deleted.mp3",
};

/** Reproduce el chime indicado. */
export function playNoteChime(kind = "updated") {
  const src = CHIMES[kind] || CHIMES.updated;
  play(src);
}
