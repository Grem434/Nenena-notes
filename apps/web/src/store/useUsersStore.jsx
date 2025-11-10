import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid/non-secure";
import { supabase, hasSupabase } from "@/lib/supabaseClient";

/**
 * useUsersStore.jsx — sincroniza con tabla 'nenena_users' de Supabase
 * - Pull inicial + realtime (INSERT/UPDATE) + upsert remoto
 * - Saneo de usuarios (name en JSON)
 * - API compatible con Sidebar/UsersSheetMobile
 */

const TABLE = "nenena_users";
const DEFAULT_USERS = ["Catalina", "Cristina", "David", "Esther", "Griselda", "Yolanda", "TODOS"];

// Normalizador de color
const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n ?? 0)));
const cleanHSV = (c) => ({
  h: ((Number(c?.h) || 0) % 360 + 360) % 360,
  s: clamp(c?.s, 0, 100),
  v: clamp(c?.v, 0, 100),
});

// Saneo: usuarios con name en JSON o sin id
const looksLikeJSONName = (s) => typeof s === "string" && s.trim().startsWith("{") && s.includes('"name"');
function fixCorruptedUsers(arr) {
  const now = new Date().toISOString();
  return {
    next: (arr || []).map((u) => {
      if (u && looksLikeJSONName(u.name)) {
        try {
          const parsed = JSON.parse(u.name);
          return {
            ...u,
            id: u.id || crypto.randomUUID?.() || `${Math.random()}`,
            name: String(parsed?.name || "Usuario"),
            color: cleanHSV(parsed?.color || u.color || { h: 200, s: 80, v: 90 }),
            updated_at: now,
          };
        } catch { /* ignore */ }
      }
      if (u && !u.id && u.name && u.color) {
        return {
          id: crypto.randomUUID?.() || `${Math.random()}`,
          name: String(u.name),
          color: cleanHSV(u.color),
          updated_at: now,
        };
      }
      return {
        id: u?.id || crypto.randomUUID?.() || `${Math.random()}`,
        name: String(u?.name || "Usuario"),
        color: cleanHSV(u?.color || { h: 200, s: 80, v: 90 }),
        updated_at: u?.updated_at || now,
      };
    }),
    changed: true,
  };
}

// Mapea fila BD → local
const mapRowToLocal = (row) => ({
  id: row.id || row.uuid || `${row.name}`,
  name: String(row.name),
  color: cleanHSV(row.color || { h: 200, s: 80, v: 90 }),
  updated_at: row.updated_at || row.inserted_at || row.updatedAt || new Date().toISOString(),
});

export const useUsersStore = create(
  persist(
    (set, get) => ({
      users: [],
      pendingDeleteId: null,

      // Flags de sync
      _realtimeChan: null,
      _syncEnabled: false,
      _pollTimer: null,

      ensureDefaults: () => {
        const cur0 = get().users || [];
        const { next: repaired } = fixCorruptedUsers(cur0);
        set({ users: repaired });
        const cur = repaired;

        const names = new Set(cur.map((u) => u.name));
        const add = DEFAULT_USERS.filter((n) => !names.has(n));
        if (add.length === 0) return;

        const withDefaults = [
          ...cur,
          ...add.map((name) => ({
            id: nanoid(),
            name,
            color: { h: Math.random() * 360, s: 80, v: 90 },
            updated_at: new Date().toISOString(),
          })),
        ];
        set({ users: withDefaults });
      },

      addUser: (input) => {
        const now = new Date().toISOString();
        let name = "";
        let color = { h: Math.random() * 360, s: 80, v: 90 };

        if (typeof input === "string") {
          if (looksLikeJSONName(input)) {
            try {
              const parsed = JSON.parse(input);
              name = String(parsed?.name || "");
              if (parsed?.color) color = cleanHSV(parsed.color);
            } catch { name = String(input || ""); }
          } else {
            name = input;
          }
        } else if (input && typeof input === "object") {
          name = String(input.name || "");
          if (input.color) color = cleanHSV(input.color);
        }

        name = name.trim();
        if (!name) return;

        const cur = get().users || [];
        if (cur.some((u) => u.name === name)) return;

        const u = { id: nanoid(), name, color, updated_at: now };
        set({ users: [...cur, u] });

        if (get()._syncEnabled) {
          try { get().upsertRemote(name, color, now); } catch {}
        }
      },

      updateColor: (name, color) => {
        const c = cleanHSV(color);
        const now = new Date().toISOString();
        set((state) => ({
          users: (state.users || []).map((u) =>
            u.name === name ? { ...u, color: c, updated_at: now } : u
          ),
        }));
        if (get()._syncEnabled) {
          try { get().upsertRemote(name, c, now); } catch {}
        }
      },

      askDeleteUser: (name) => set({ pendingDeleteId: name }),
      cancelDeleteUser: () => set({ pendingDeleteId: null }),
      confirmDeleteUser: () => {
        const id = get().pendingDeleteId;
        if (!id) return;
        set((state) => ({
          users: (state.users || []).filter((u) => u.name !== id),
          pendingDeleteId: null,
        }));
        // (opcional) borrar remoto
      },

      // Pull inicial y periódico
      pullUsersFromBackend: async () => {
        if (!hasSupabase || !supabase) return;
        const { data, error } = await supabase
          .from(TABLE)
          .select("name,color,updated_at,inserted_at,id,uuid")
          .order("updated_at", { ascending: false });
        if (error || !Array.isArray(data)) return;

        set((state) => {
          const byName = new Map((state.users || []).map((u) => [u.name, u]));
          for (const row of data) {
            if (!row?.name) continue;
            const m = mapRowToLocal(row);
            const prev = byName.get(m.name);
            if (!prev) byName.set(m.name, m);
            else {
              const pt = new Date(prev.updated_at || 0).getTime();
              const nt = new Date(m.updated_at || 0).getTime();
              if (nt >= pt) byName.set(m.name, { ...prev, ...m });
            }
          }
          return { users: Array.from(byName.values()) };
        });
      },

      // Realtime
      startSync: async () => {
        if (get()._syncEnabled) return;
        set({ _syncEnabled: true });

        if (!hasSupabase || !supabase) return;

        try { await get().pullUsersFromBackend(); } catch {}

        const chan = supabase
          .channel("nenena_users_realtime")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: TABLE },
            (payload) => {
              const row = payload?.new;
              if (!row?.name) return;
              const m = mapRowToLocal(row);
              set((state) => {
                const cur = state.users || [];
                if (cur.some((u) => u.name === m.name)) {
                  return {
                    users: cur.map((u) => {
                      if (u.name !== m.name) return u;
                      const pt = new Date(u.updated_at || 0).getTime();
                      const nt = new Date(m.updated_at || 0).getTime();
                      return nt >= pt ? { ...u, ...m } : u;
                    }),
                  };
                }
                return { users: [m, ...cur] };
              });
            }
          )
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: TABLE },
            (payload) => {
              const row = payload?.new;
              if (!row?.name) return;
              const m = mapRowToLocal(row);
              set((state) => ({
                users: (state.users || []).map((u) => {
                  if (u.name !== m.name) return u;
                  const pt = new Date(u.updated_at || 0).getTime();
                  const nt = new Date(m.updated_at || 0).getTime();
                  return nt >= pt ? { ...u, ...m } : u;
                }),
              }));
            }
          )
          .subscribe();
        set({ _realtimeChan: chan });

        const t = setInterval(() => {
          get().pullUsersFromBackend()?.catch?.(() => {});
        }, 45000);
        set({ _pollTimer: t });
      },

      stopSync: async () => {
        set({ _syncEnabled: false });
        try { if (get()._pollTimer) clearInterval(get()._pollTimer); } catch {}
        set({ _pollTimer: null });
        try {
          const ch = get()._realtimeChan;
          if (ch && supabase) supabase.removeChannel(ch);
        } catch {}
        set({ _realtimeChan: null });
      },

      // Upsert remoto
      upsertRemote: async (name, color, updated_at) => {
        try {
          if (hasSupabase && supabase) {
            await supabase.from(TABLE).upsert(
              { name, color, updated_at },
              { onConflict: "name" }
            );
          }
        } catch { /* silent */ }
      },
    }),
    {
      name: "nenena-users",
      version: 4,
      migrate: (persisted, _v) => {
        const data = persisted || { users: [] };
        const users = Array.isArray(data.users) ? data.users : [];
        const { next } = fixCorruptedUsers(users);
        return { ...data, users: next };
      },
      partialize: (s) => ({ users: s.users }),
    }
  )
);

// Arranque: defaults + sync
if (typeof window !== "undefined") {
  const s = useUsersStore.getState();
  try { s.ensureDefaults(); } catch {}
  try { s.startSync(); } catch {}

  window.addEventListener("beforeunload", () => {
    try { s.stopSync(); } catch {}
  });
}
