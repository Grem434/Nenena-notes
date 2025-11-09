import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { supabase } from "@/lib/supabaseClient"; // named export { supabase }
import { fetchPaletteVersion, bumpPaletteVersion } from "@/lib/sync";
import { useStyleStore } from "@/store/useStyleStore";
import { notify } from "@/lib/notify";

/** ===========================================================
 *  Usuarios por defecto (solo para asegurar presencia local)
 *  =========================================================== */
const DEFAULT_USERS = [
  "Catalina",
  "Cristina",
  "David",
  "Esther",
  "Griselda",
  "Yolanda",
  "TODOS",
];

/** ===========================================================
 *  Utils color (HSV saneado) y helpers varios
 *  =========================================================== */
const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n ?? 0)));
const cleanHSV = (c) => ({
  h: ((Number(c?.h) || 0) % 360 + 360) % 360,
  s: clamp(c?.s, 0, 100),
  v: clamp(c?.v, 0, 100),
});
// --- reparar nombres corruptos guardados como JSON string ---
const looksLikeJSONName = (s) => typeof s === "string" && s.trim().startsWith("{") && s.includes('"name"');
function fixCorruptedUsers(arr) {
  let changed = false;
  const now = new Date().toISOString();
  const next = (arr || []).map((u) => {
    if (u && looksLikeJSONName(u.name)) {
      try {
        const parsed = JSON.parse(u.name);
        const fixed = {
          ...u,
          name: String(parsed.name || "Usuario"),
          color: cleanHSV(parsed.color || u.color || { h: 200, s: 80, v: 90 }),
          updated_at: now,
        };
        changed = true;
        return fixed;
      } catch {
        return u;
      }
    }
    return u;
  });
  return { next, changed };
}


/** ===========================================================
 *  Store
 *  =========================================================== */
export const useUsersStore = create(
  persist(
    (set, get) => ({
      users: [],

      /** -------------------- CRUD local -------------------- **/
      ensureDefaults: () => {
        const cur0 = get().users || [];
        // Reparar entradas corruptas con name = JSON string
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
        get()._syncEnabled && get().upsertRemote(name, color, now);
      },
          updated_at: new Date().toISOString(),
        };
        set({ users: [...cur, u] });
        get()._syncEnabled && get().upsertRemote(name, u.color);
      },

      removeUser: (name) => {
        set({ users: (get().users || []).filter((u) => u.name !== name) });
        get()._syncEnabled && get().removeRemote(name);
      },

      updateColor: async (name, hsv) => {
        const color = cleanHSV(hsv);
        const now = new Date().toISOString();
        const next = (get().users || []).map((u) =>
          u.name === name ? { ...u, color, updated_at: now } : u
        );
        set({ users: next });

        if (get()._syncEnabled) {
          // 1) Sube color
          const ok = await get().upsertRemote(name, color, now);
          if (!ok) {
            notify({
              title: "No se pudo sincronizar el color",
              description: "Revisa las políticas RLS de 'public.nenena_users'.",
              variant: "destructive",
            });
            return;
          }
          // 2) Bumpea versión global
          const { version } = await bumpPaletteVersion();
          try {
            useStyleStore.getState().setPaletteVersion(version);
          } catch {}
        }
      },

      renameUser: (oldName, newName) => {
        if (!newName) return;
        const now = new Date().toISOString();
        const next = (get().users || []).map((u) =>
          u.name === oldName ? { ...u, name: newName, updated_at: now } : u
        );
        set({ users: next });
        if (get()._syncEnabled) {
          get().removeRemote(oldName);
          const u = next.find((x) => x.name === newName);
          if (u) get().upsertRemote(newName, u.color, now);
        }
      },

      /** -------------------- SYNC -------------------- **/
      _syncEnabled: false,
      _realtimeChan: null,

      /**
       * FUSIÓN “suave” remoto->local respetando updated_at (modo default)
       */
      _mergeRemoteRows: (rows) => {
        const local = get().users || [];
        const map = new Map(local.map((u) => [u.name, u]));
        for (const row of rows || []) {
          // El esquema esperado es { name, color(jsonb), updated_at }
          const r = {
            id: map.get(row.name)?.id || nanoid(),
            name: row.name,
            color: cleanHSV(row.color || { h: 200, s: 80, v: 90 }),
            updated_at: row.updated_at || new Date().toISOString(),
          };
          const l = map.get(row.name);
          if (!l || (r.updated_at && (!l.updated_at || r.updated_at > l.updated_at))) {
            map.set(row.name, r);
          }
        }
        // Mantén los predefinidos si faltan
        for (const n of DEFAULT_USERS) {
          if (!map.has(n)) {
            map.set(n, {
              id: nanoid(),
              name: n,
              color: { h: Math.random() * 360, s: 80, v: 90 },
              updated_at: new Date().toISOString(),
            });
          }
        }
        set({ users: Array.from(map.values()) });
      },

      /**
       * OVERWRITE total: copia literal colores remotos sobre los usuarios
       * locales por nombre (añade faltantes; deja locales no presentes como están).
       * Útil para “Actualizar colores” en móvil.
       */
      _overwriteFromRemoteRows: (rows) => {
        const byName = new Map((get().users || []).map((u) => [u.name, { ...u }]));
        for (const row of rows || []) {
          const name = row?.name;
          if (!name) continue;
          const current = byName.get(name) || { id: nanoid(), name };
          byName.set(name, {
            ...current,
            color: cleanHSV(row.color || current.color || { h: 200, s: 80, v: 90 }),
            updated_at: row.updated_at || new Date().toISOString(),
          });
        }
        // Garantiza los predefinidos
        for (const n of DEFAULT_USERS) {
          if (!byName.has(n)) {
            byName.set(n, {
              id: nanoid(),
              name: n,
              color: { h: Math.random() * 360, s: 80, v: 90 },
              updated_at: new Date().toISOString(),
            });
          }
        }
        set({ users: Array.from(byName.values()) });
      },

      /**
       * Descarga remota con selector de estrategia.
       * @param {"merge"|"overwrite"} mode
       */
      pullRemote: async (mode = "merge") => {
        if (!supabase) return { data: null, error: "no-client" };
        try {
          const { data, error } = await supabase
            .from("nenena_users")
            .select("name,color,updated_at")
            .order("name", { ascending: true });

          if (error) return { data: null, error };

          if (mode === "overwrite") get()._overwriteFromRemoteRows(data || []);
          else get()._mergeRemoteRows(data || []);

          return { data: true, error: null };
        } catch (e) {
          return { data: null, error: e };
        }
      },

      /**
       * Chequea versión remota y hace pull si es mayor que la local.
       * Si force === true, hace pull en modo OVERWRITE.
       */
      pullUsersIfStale: async (force = false) => {
        try {
          const localV = Number(useStyleStore.getState().users_palette_version || 0);
          const { version: remoteV } = await fetchPaletteVersion();

          const mustPull = force || Number(remoteV) > localV;
          if (mustPull) {
            await get().pullRemote(force ? "overwrite" : "merge");
            useStyleStore.getState().setPaletteVersion(Number(remoteV));
            return { pulled: true, remoteV, localV };
          }
          return { pulled: false, remoteV, localV };
        } catch (e) {
          notify({
            title: "No se pudo comprobar la versión de colores",
            description: e?.message || String(e),
            variant: "destructive",
          });
          return { pulled: false, error: e };
        }
      },

      /**
       * Upsert remoto de un usuario/color
       */
      upsertRemote: async (name, color, updatedAt) => {
        if (!supabase) return false;
        try {
          const { error } = await supabase.from("nenena_users").upsert(
            {
              name,
              color: cleanHSV(color),
              updated_at: updatedAt || new Date().toISOString(),
            },
            { onConflict: "name" }
          );
          if (error) throw error;
          return true;
        } catch (e) {
          console.error("[upsertRemote] error:", e?.message || e);
          return false;
        }
      },

      removeRemote: async (name) => {
        if (!supabase) return;
        try {
          const { error } = await supabase.from("nenena_users").delete().eq("name", name);
          if (error) throw error;
        } catch (e) {
          console.error("[removeRemote] error:", e?.message || e);
        }
      },

      /**
       * Inicio de sincronización:
       *  - Verifica acceso a tabla
       *  - Pull inicial en modo OVERWRITE (para alinear móvil/escritorio)
       *  - Suscripción realtime: ante cambios, revalida versión
       */
      startSync: async () => {
        if (!supabase || get()._syncEnabled) return;

        const probe = await supabase.from("nenena_users").select("name").limit(1);
        if (probe.error) {
          set({ _syncEnabled: false });
          console.warn("[startSync] No hay permisos sobre nenena_users:", probe.error?.message);
          return;
        }

        set({ _syncEnabled: true });

        // Pull inicial en overwrite para evitar divergencias previas
        await get().pullUsersIfStale(true);

        // Realtime: si hay cambios en la tabla, revalida versión y pull si procede
        const chan = supabase
          .channel("nenena_users_changes")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "nenena_users" },
            async () => {
              await get().pullUsersIfStale(false);
            }
          )
          .subscribe(() => {});

        set({ _realtimeChan: chan });

        // Re-chequeo al recuperar foco
        try {
          window.addEventListener("visibilitychange", async () => {
            if (document.visibilityState === "visible") {
              await get().pullUsersIfStale(false);
            }
          });
        } catch {}
      },

      stopSync: async () => {
        try {
          const ch = get()._realtimeChan;
          if (ch && supabase?.removeChannel) await supabase.removeChannel(ch);
        } catch {}
        set({ _realtimeChan: null, _syncEnabled: false });
      },
    }),
    {
      name: "nenena-users",
      version: 3, // ⬅ bump versión de persistencia por el cambio de lógica (overwrite)
      migrate: (persisted, _version) => persisted || { users: [] },
      partialize: (s) => ({ users: s.users }),
    }
  )
);

/** Arranque: defaults + sync */
if (typeof window !== "undefined") {
  const s = useUsersStore.getState();
  s.ensureDefaults();
  s.startSync?.();

  window.addEventListener("beforeunload", () => {
    try {
      s.stopSync?.();
    } catch {}
  });
}
