import { create } from "zustand";
import { persist } from "zustand/middleware";
import { pushNoteChange, pushReplyChange } from "@/lib/sync";

/* ===========================================================
   SINGLETON GUARD — evita múltiples instancias de la store
   =========================================================== */
const GLOBAL_KEY = "__nenena_stores__";
const NOTES_KEY = "useNotesStoreSingleton";
const STORAGE_KEY = "nenena-notes"; // clave de persistencia (debe ser única y estable)

function ensureGlobal() {
  if (typeof globalThis === "undefined") return {};
  if (!globalThis[GLOBAL_KEY]) globalThis[GLOBAL_KEY] = {};
  return globalThis[GLOBAL_KEY];
}

/* ================= Utilidades comunes =================== */
const nowISO = () => new Date().toISOString();

function uuidv4() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  const b = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
function isUUIDv4(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ""));
}

function mapRowToLocal(row) {
  if (!row) return null;
  return {
    id: row.id,
    from: row.from ?? row["from"] ?? "",
    to: row.to ?? row["to"] ?? "",
    text: row.text ?? "",
    status: row.status === "resuelta" ? "resuelta" : "pendiente",
    archived: !!row.archived,
    deleted: !!row.deleted,
    createdAt: row.created_at || row.createdAt || nowISO(),
    updatedAt: row.updated_at || row.updatedAt || row.created_at || nowISO(),
    dueAt: row.due_at || row.dueAt || null,
    readAt: row.read_at || row.readAt || null,
    replies: Array.isArray(row.replies) ? row.replies : [],
  };
}

/* ================= FACTORY (una sola vez) ================= */
function createNotesStore() {
  return create(
    persist(
      (set, get) => ({
        notes: [],
        filter: "todas",

        setFilter: (f) => set({ filter: f }),

        /* ---------- Crear (con anti-duplicado 2s) ---------- */
        addNote: (note) =>
          set((state) => {
            const id = isUUIDv4(note.id) ? note.id : uuidv4();
            const createdAt = note.createdAt || nowISO();
            const updatedAt = note.updatedAt || createdAt;
            const newNote = {
              id,
              from: note.from || "",
              to: note.to || "",
              text: note.text || "",
              status: note.status === "resuelta" ? "resuelta" : "pendiente",
              archived: !!note.archived,
              deleted: false, // 👈 siempre nace no borrada
              createdAt,
              updatedAt,
              dueAt: note.dueAt || null,
              readAt: null,
              replies: Array.isArray(note.replies) ? note.replies : [],
            };

            // Anti-duplicado: si existe una nota igual en los últimos 2s, no crear otra
            const twoSecAgo = Date.now() - 2000;
            const exists = state.notes.slice(0, 50).some((n) => {
              if (n.from !== newNote.from || n.to !== newNote.to) return false;
              if ((n.text || "").trim() !== (newNote.text || "").trim()) return false;
              const t = new Date(n.createdAt || n.updatedAt || 0).getTime();
              return t >= twoSecAgo;
            });
            if (exists) return { notes: state.notes };

            try {
              pushNoteChange("insert", newNote);
            } catch {}
            return { notes: [newNote, ...state.notes] };
          }),

        /* ---------- Actualizar genérico ---------- */
        updateNote: (id, patch) =>
          set((state) => {
            const notes = state.notes.map((n) => {
              if (n.id !== id) return n;
              const updated = { ...n, ...patch, updatedAt: nowISO() };
              try {
                pushNoteChange("update", updated);
              } catch {}
              return updated;
            });
            return { notes };
          }),

        /* ---------- Leído ---------- */
        markRead: (id) =>
          set((state) => {
            const notes = state.notes.map((n) => {
              if (n.id !== id) return n;
              const updated = { ...n, readAt: nowISO(), updatedAt: nowISO() };
              try {
                pushNoteChange("update", updated);
              } catch {}
              return updated;
            });
            return { notes };
          }),

        /* ---------- Responder (PATCH mínimo de replies) ---------- */
        addReply: (id, { author, text }) =>
          set((state) => {
            const notes = state.notes.map((n) => {
              if (n.id !== id) return n;
              const reply = {
                id: uuidv4(),
                author: author || n.to || "",
                text: text || "",
                createdAt: nowISO(),
              };
              const newReplies = [...(n.replies || []), reply];
              const updated = {
                ...n,
                replies: newReplies,
                readAt: nowISO(),
                updatedAt: nowISO(),
              };
              try {
                pushReplyChange(id, newReplies);
              } catch {}
              return updated;
            });
            return { notes };
          }),

        /* ---------- Otros ---------- */
        setDueDate: (id, dueAt) =>
          set((state) => {
            const notes = state.notes.map((n) => {
              if (n.id !== id) return n;
              const updated = { ...n, dueAt, updatedAt: nowISO() };
              try {
                pushNoteChange("update", updated);
              } catch {}
              return updated;
            });
            return { notes };
          }),

        toggleStatus: (id) =>
          set((state) => {
            const notes = state.notes.map((n) => {
              if (n.id !== id) return n;
              const updated = {
                ...n,
                status: n.status === "pendiente" ? "resuelta" : "pendiente",
                updatedAt: nowISO(),
              };
              try {
                pushNoteChange("update", updated);
              } catch {}
              return updated;
            });
            return { notes };
          }),

        archiveNote: (id) =>
          set((state) => {
            const notes = state.notes.map((n) => {
              if (n.id !== id) return n;
              const updated = { ...n, archived: true, updatedAt: nowISO() };
              try {
                pushNoteChange("update", updated);
              } catch {}
              return updated;
            });
            return { notes };
          }),

        unarchiveNote: (id) =>
          set((state) => {
            const notes = state.notes.map((n) => {
              if (n.id !== id) return n;
              const updated = { ...n, archived: false, updatedAt: nowISO() };
              try {
                pushNoteChange("update", updated);
              } catch {}
              return updated;
            });
            return { notes };
          }),

        // 👇 aquí ya estabas haciendo borrado suave. Lo dejamos así.
        deleteNote: (id) =>
          set((state) => {
            const notes = state.notes.map((n) => {
              if (n.id !== id) return n;
              const updated = { ...n, deleted: true, updatedAt: nowISO() };
              try {
                pushNoteChange("update", updated);
              } catch {}
              return updated;
            });
            return { notes };
          }),

        restoreNote: (id) =>
          set((state) => {
            const notes = state.notes.map((n) => {
              if (n.id !== id) return n;
              const updated = { ...n, deleted: false, updatedAt: nowISO() };
              try {
                pushNoteChange("update", updated);
              } catch {}
              return updated;
            });
            return { notes };
          }),

        /* ---------- Borrado DEFINITIVO (papelera) ---------- */
        hardRemove: (id) => {
          try {
            pushNoteChange("delete", { id });
          } catch {}
          set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));
        },

        /* ---------- Merge remoto seguro ---------- */
        applyRemoteNote: (row, eventType = "INSERT") =>
          set((state) => {
            const m = mapRowToLocal(row);
            if (!m?.id) return {};
            if (eventType === "DELETE") {
              return { notes: state.notes.filter((n) => n.id !== m.id) };
            }
            const idx = state.notes.findIndex((n) => n.id === m.id);
            if (idx === -1) return { notes: [m, ...state.notes] };

            const prev = state.notes[idx];
            const prevTime = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
            const nextTime = new Date(m.updatedAt || m.createdAt || 0).getTime();
            if (nextTime < prevTime) return {};
            const clone = state.notes.slice();
            clone[idx] = { ...prev, ...m };
            return { notes: clone };
          }),

        applyRemoteNotes: (rows = []) =>
          set((state) => {
            const byId = new Map(state.notes.map((n) => [n.id, n]));
            for (const row of rows) {
              const m = mapRowToLocal(row);
              if (!m?.id) continue;
              const prev = byId.get(m.id);
              if (!prev) byId.set(m.id, m);
              else {
                const prevTime = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
                const nextTime = new Date(m.updatedAt || m.createdAt || 0).getTime();
                if (nextTime >= prevTime) byId.set(m.id, { ...prev, ...m });
              }
            }
            return {
              notes: Array.from(byId.values()).sort(
                (a, b) =>
                  new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
              ),
            };
          }),
      }),
      {
        name: STORAGE_KEY,
        version: 11,
        partialize: (s) => ({ notes: s.notes, filter: s.filter, version: 11 }),
        migrate: (p) => {
          const st = p || {};
          const arr = Array.isArray(st.notes) ? st.notes : [];
          const norm = (n) => ({
            id: isUUIDv4(n.id) ? n.id : uuidv4(),
            from: n.from ?? n.de ?? "",
            to: n.to ?? n.para ?? "",
            text: n.text ?? n.body ?? n.content ?? "",
            status: n.status === "resuelta" ? "resuelta" : "pendiente",
            archived: !!n.archived,
            deleted: !!n.deleted,
            createdAt: n.createdAt || nowISO(),
            updatedAt: n.updatedAt || n.createdAt || nowISO(),
            dueAt: n.dueAt || null,
            readAt: n.readAt || null,
            replies: Array.isArray(n.replies) ? n.replies : [],
          });
          return { notes: arr.map(norm), filter: st.filter || "todas", version: 11 };
        },
      }
    )
  );
}

/* ============== Export: la MISMA instancia siempre ============== */
const g = ensureGlobal();
export const useNotesStore = g[NOTES_KEY] || (g[NOTES_KEY] = createNotesStore());
