import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid/non-secure";
import { supabase, hasSupabase } from "@/lib/supabaseClient";

/**
 * useUsersStore.jsx
 * Versión compacta y estable. API compatible con Sidebar/UsersSheetMobile:
 * - users, pendingDeleteId
 * - ensureDefaults(), addUser(input), updateColor(name, color)
 * - askDeleteUser(name), cancelDeleteUser(), confirmDeleteUser()
 * - startSync(), stopSync(), upsertRemote() (no-op seguro si no hay Supabase)
 */

const DEFAULT_USERS = ["Catalina", "Cristina", "David", "Esther", "Griselda", "Yolanda", "TODOS"];

// Normalizador de color
const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n ?? 0)));
const cleanHSV = (c) => ({
  h: ((Number(c?.h) || 0) % 360 + 360) % 360,
  s: clamp(c?.s, 0, 100),
  v: clamp(c?.v, 0, 100),
});

// Detección y reparación de usuarios corruptos (name guardado como JSON string)
const looksLikeJSONName = (s) => typeof s === "string" && s.trim().startsWith("{") && s.includes('"name"');
function fixCorruptedUsers(arr) {
  let changed = false;
  const now = new Date().toISOString();
  const out = (arr || []).map((u) => {
    if (u && looksLikeJSONName(u.name)) {
      try {
        const parsed = JSON.parse(u.name);
        changed = true;
        return {
          ...u,
          name: String(parsed?.name || "Usuario"),
          color: cleanHSV(parsed?.color || u.color || { h: 200, s: 80, v: 90 }),
          updated_at: now,
        };
      } catch {
        return u;
      }
    }
    return u;
  });
  return { next: out, changed };
}

export const useUsersStore = create(
  persist(
    (set, get) => ({
      users: [],
      pendingDeleteId: null,

      // —— Sync flags (seguros si no hay Supabase) ——
      _realtimeChan: null,
      _syncEnabled: false,

      ensureDefaults: () => {
        const cur0 = get().users || [];
        // Reparar nombres corruptos
        const { next: repaired, changed } = fixCorruptedUsers(cur0);
        if (changed) set({ users: repaired });
        const cur = changed ? repaired : cur0;

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
            } catch {
              name = String(input || "");
            }
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

        // Upsert remoto opcional
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

      // —— Sync muy básico y seguro ——
      startSync: async () => {
        set({ _syncEnabled: true });
        // Si quisieras, aquí podrías abrir un canal realtime de "users".
        // Lo dejamos no-op para no interferir con otras suscripciones.
      },
      stopSync: async () => {
        set({ _syncEnabled: false, _realtimeChan: null });
      },

      // Upsert remoto (seguro si hay supabase)
      upsertRemote: async (name, color, updated_at) => {
        try {
          if (hasSupabase && supabase) {
            await supabase.from("users").upsert(
              { name, color, updated_at },
              { onConflict: "name" }
            );
          }
        } catch {
          // Silenciar errores remotos para no romper UI
        }
      },
    }),
    {
      name: "nenena-users",
      version: 3,
      migrate: (persisted, _v) => persisted || { users: [] },
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
