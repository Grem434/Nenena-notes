import { getSupabase } from "./supabaseClient";

/* --------------------- Realtime notas --------------------- */
let channel = null;
let onRemoteUpsert = null;

function log(...a) {
  if (import.meta?.env?.DEV) console.info("[sync]", ...a);
}

export function startNotesSync({ onUpsert } = {}) {
  const supabase = getSupabase();
  onRemoteUpsert = onUpsert || null;

  if (!supabase) {
    log("Supabase no configurado. Modo local.");
    return () => {};
  }

  stopNotesSync();

  channel = supabase
    .channel("notes-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notes" },
      (payload) => {
        const row = payload.new ?? payload.old;
        if (!row) return;
        log("realtime:", payload.eventType, row.id);
        onRemoteUpsert && onRemoteUpsert(row, payload.eventType);
      }
    )
    .subscribe((status) => log("channel:", status));

  return stopNotesSync;
}

export function stopNotesSync() {
  if (channel?.unsubscribe) {
    try { channel.unsubscribe(); } catch {}
  }
  channel = null;
}

/* --------------------- Pull inicial --------------------- */
export async function pullAllNotes() {
  const supabase = getSupabase();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("notes")
    .select("id, from, to, text, status, archived, deleted, created_at, updated_at, due_at, read_at, replies")
    .order("updated_at", { ascending: false });

  if (error) log("pullAllNotes error:", error.message);
  return { data: data || [], error };
}

/* --------------------- Cola de push ---------------------- */
const queue = [];
let pushing = false;
let retryTimer = null;
let retryDelayMs = 800;
const RETRY_MAX = 8000;

function scheduleDrain() {
  if (pushing || retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void _drain();
  }, retryDelayMs);
}

function isUUIDv4(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ""));
}

function mapLocalToRow(note) {
  return {
    id: note.id,
    from: note.from ?? "",
    to: note.to ?? "",
    text: note.text ?? "",
    status: note.status === "resuelta" ? "resuelta" : "pendiente",
    archived: !!note.archived,
    deleted: !!note.deleted,
    due_at: note.dueAt ? String(note.dueAt).slice(0, 10) : null,
    created_at: note.createdAt || new Date().toISOString(),
    updated_at: note.updatedAt || new Date().toISOString(),
    read_at: note.readAt ?? null,
    replies: Array.isArray(note.replies) ? note.replies : [],
  };
}

/** Push genérico (insert/update/delete). */
export function pushNoteChange(op, note) {
  const supabase = getSupabase();
  if (!supabase) { log("push omitido (sin supabase)", op, note?.id); return; }
  if (!note?.id || !isUUIDv4(note.id)) { log("omit push (id inválido)"); return; }
  queue.push({ kind: "full", op, note: { ...note } });
  if (!pushing) void _drain();
}

/** Push mínimo sólo para replies (evita NOT NULL de otras columnas). */
export function pushReplyChange(id, replies) {
  const supabase = getSupabase();
  if (!supabase) { log("pushReply omitido (sin supabase)"); return; }
  if (!id || !isUUIDv4(id)) { log("pushReply omitido (id inválido)"); return; }
  queue.push({ kind: "replies", id, replies: Array.isArray(replies) ? replies : [] });
  if (!pushing) void _drain();
}

async function _drain() {
  const supabase = getSupabase();
  if (!supabase) { pushing = false; return; }
  if (pushing) return;
  pushing = true;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }

  while (queue.length) {
    const job = queue[0];
    try {
      let error = null;

      if (job.kind === "replies") {
        // 🔒 UPDATE mínimo: sólo replies + updated_at
        const payload = { replies: job.replies, updated_at: new Date().toISOString() };
        if (import.meta.env.DEV) console.info("[sync] update replies", job.id, payload);
        const { error: e } = await supabase.from("notes").update(payload).eq("id", job.id);
        error = e || null;
      } else {
        const { op, note } = job;
        if (op === "delete") {
          const { error: e } = await supabase.from("notes").delete().eq("id", note.id);
          error = e || null;
        } else if (op === "insert") {
          const row = mapLocalToRow(note);
          const { error: e } = await supabase.from("notes").upsert(row, { onConflict: "id" });
          error = e || null;
        } else {
          // UPDATE completo por id (pero jamás upsert aquí)
          const row = mapLocalToRow(note);
          delete row.created_at;
          const { error: e } = await supabase.from("notes").update(row).eq("id", note.id);
          error = e || null;
        }
      }

      if (error) throw error;

      queue.shift();
      retryDelayMs = 800;
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[sync] push error:", err?.message || err);
      pushing = false;
      retryDelayMs = Math.min(retryDelayMs * 2, RETRY_MAX);
      scheduleDrain();
      return;
    }
  }

  pushing = false;
}

/* =================================================================== */
/* ===================  PALETA: VERSIONADO & HELPERS  ================= */
/* =================================================================== */

async function ensureSettingsRow() {
  const supabase = getSupabase();
  if (!supabase) return { version: 0, created: false };

  const { data } = await supabase
    .from("settings")
    .select("id, users_palette_version")
    .eq("id", "global")
    .maybeSingle();

  if (!data) {
    const { data: up } = await supabase
      .from("settings")
      .upsert({ id: "global", users_palette_version: 1 }, { onConflict: "id" })
      .select("users_palette_version")
      .maybeSingle();
    return { version: up?.users_palette_version || 1, created: true };
  }
  return { version: Number(data.users_palette_version || 1), created: false };
}

export async function fetchPaletteVersion() {
  const supabase = getSupabase();
  if (!supabase) return { version: 0, error: "no-client" };
  const ensured = await ensureSettingsRow();
  return { version: ensured.version, error: null };
}

export async function bumpPaletteVersion() {
  const supabase = getSupabase();
  if (!supabase) return { version: 0, error: "no-client" };

  const { version: cur } = await ensureSettingsRow();
  const next = Number(cur || 1) + 1;

  const { data, error } = await supabase
    .from("settings")
    .upsert({ id: "global", users_palette_version: next }, { onConflict: "id" })
    .select("users_palette_version")
    .maybeSingle();

  if (error) return { version: cur, error };
  return { version: data?.users_palette_version ?? next, error: null };
}

export async function fetchAllUserRows() {
  const supabase = getSupabase();
  if (!supabase) return { rows: [], error: "no-client" };
  const { data, error } = await supabase
    .from("nenena_users")
    .select("name,color,updated_at")
    .order("name", { ascending: true });
  return { rows: data || [], error };
}
