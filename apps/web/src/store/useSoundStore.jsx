import { create } from "zustand";
import { persist } from "zustand/middleware";

// 🎧 Store global de sonido (persistente)
export const useSoundStore = create(
  persist(
    (set, get) => ({
      isMuted: false,
      volume: 0.6,      // 0..1
      lastVolume: 0.6,  // para restaurar tras desmutear

      // Alterna mute conservando el volumen previo
      toggleMute: () =>
        set((state) => {
          const nextMuted = !state.isMuted;
          return nextMuted
            ? { isMuted: true, lastVolume: state.volume, volume: 0 }
            : {
                isMuted: false,
                volume: state.lastVolume > 0 ? state.lastVolume : 0.6,
              };
        }),

      // Ajusta volumen 0..1 y sincroniza mute
      setVolume: (v) =>
        set((state) => {
          const clamped = Math.max(0, Math.min(1, Number(v)));
          return {
            volume: clamped,
            isMuted: clamped === 0 ? true : false,
            lastVolume:
              clamped > 0 ? clamped : state.lastVolume || 0.6,
          };
        }),
    }),
    { name: "nenena-sound" }
  )
);
