import { create } from "zustand";
import { persist } from "zustand/middleware";

// 🎨 Preferencias visuales (persistentes)
export const useStyleStore = create(
  persist(
    (set) => ({
      cardTone: "soft", // 'soft' | 'pro'
      toggleCardTone: () =>
        set((state) => ({
          cardTone: state.cardTone === "soft" ? "pro" : "soft",
        })),
      setCardTone: (tone) => set({ cardTone: tone }),

      // 🧩 Versionado de paleta (para sincronización determinista)
      users_palette_version: 0, // default local
      setPaletteVersion: (v) =>
        set({ users_palette_version: Number.isFinite(v) ? Number(v) : 0 }),
    }),
    { name: "nenena-style" }
  )
);
