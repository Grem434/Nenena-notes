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
