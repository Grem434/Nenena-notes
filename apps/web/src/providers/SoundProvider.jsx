import { createContext, useContext } from "react";
import { useSoundStore } from "@/store/useSoundStore";

// 🎧 Contexto opcional para futuros hooks
const SoundContext = createContext(null);

export function SoundProvider({ children }) {
  const { isMuted, volume } = useSoundStore();

  // Sonido base (campanilla Nenena)
  const soundSrc = "/sounds/nenena-chime.mp3";

  // Reproduce sonido solo si no está silenciado
  const playSound = () => {
    if (isMuted || volume === 0) return;
    try {
      const audio = new Audio(soundSrc);
      audio.volume = Math.max(0, Math.min(1, Number(volume || 0)));
      audio.play().catch(() => {});
    } catch (e) {
      console.warn("No se pudo reproducir sonido:", e);
    }
  };

  return (
    <SoundContext.Provider value={{ playSound, isMuted, volume }}>
      {children}
    </SoundContext.Provider>
  );
}

// Hook para usar el sonido desde cualquier parte
export function useSound() {
  return useContext(SoundContext);
}
