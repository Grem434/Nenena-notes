// src/lib/notify.js
import { toast } from "sonner";
import { useSoundStore } from "@/store/useSoundStore";

// 🎧 Lista de listeners conectados (ToasterNenena)
let notifyListeners = [];

// Permite a otros componentes escuchar eventos
export function onNotify(callback) {
  if (typeof callback === "function") {
    notifyListeners.push(callback);
  } else if (callback === null) {
    notifyListeners = [];
  }
}

// 🎯 Función principal de notificación
export function notify({
  title = "",
  description = "",
  variant = "info",
  duration = 3000,
}) {
  try {
    const { isMuted, volume } = useSoundStore.getState();

    // 🔊 reproducir sonido local si no está silenciado
    if (!isMuted && Number(volume) > 0) {
      const audio = new Audio("/sounds/nenena-chime.mp3");
      audio.volume = Math.max(0, Math.min(1, Number(volume || 0)));
      audio.play().catch((err) => {
        console.warn("Error reproduciendo sonido:", err);
      });
    }

    // 🔔 Disparar evento a los suscriptores (ToasterNenena)
    notifyListeners.forEach((cb) =>
      cb({ title, description, variant, duration })
    );

    // 🔄 Mostrar también el toast visual del sistema base
    if (variant && toast[variant]) {
      toast[variant](description || title);
    } else {
      toast(title || description);
    }
  } catch (err) {
    console.warn("Error en notify():", err);
    toast(title || description);
  }
}
