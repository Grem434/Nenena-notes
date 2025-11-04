// 🩷 Nenena Notes — Quick Note API bridge
// Escucha notas rápidas y expone usuarios ordenados para la extensión.

import { useUsersStore } from "@/store/useUsersStore";
import { useNotesStore } from "@/store/useNotesStore";

let unsubUsers = null;

export function registerQuickNoteEndpoint(onAddNote, onSuccess, onInfo) {
  // 1) Notas rápidas desde la extensión / integraciones
  window.addEventListener("message", (event) => {
    try {
      const { type, payload } = event.data || {};
      if (type === "ADD_QUICK_NOTE" && payload) {
        // Normalizamos mínimos
        const note = {
          text: String(payload.text || "").trim(),
          from: payload.from,
          to: payload.to,
          status: payload.status || "pendiente",
          createdAt: payload.createdAt || new Date().toISOString(),
        };
        if (!note.text || !note.from || !note.to) return;
        onAddNote?.(note);
        onSuccess?.("Nota rápida recibida");
      }
    } catch (e) {
      console.warn("[quick-note] message error:", e);
    }
  });

  // 2) Exponer usuarios ordenados (Sidebar order) para la extensión
  const syncWindowUsers = () => {
    try {
      const state = useUsersStore.getState();
      const raw = state?.users || [];
      // El Sidebar usa este mismo orden; incluimos "TODOS" si tu UI lo contempla.
      const names = raw.map((u) => u.name);
      // Coloca TODOS al final si existe (ajusta según tu Sidebar actual)
      const final = names.includes("TODOS")
        ? [...names.filter(n => n !== "TODOS"), "TODOS"]
        : names;
      window.__NENENA_USERS = final;
    } catch (e) {
      console.warn("[quick-note] syncWindowUsers error:", e);
    }
  };

  // Primera exportación
  syncWindowUsers();

  // Suscripción a cambios de usuarios (añadir/eliminar/reordenar)
  try {
    unsubUsers?.();
  } catch {}
  try {
    unsubUsers = useUsersStore.subscribe(
      (s) => s.users,
      () => syncWindowUsers(),
      { fireImmediately: false }
    );
  } catch (e) {
    console.warn("[quick-note] subscribe error:", e);
  }

  // También actualizamos al ganar foco (por si la app cambió en otra pestaña)
  window.addEventListener("focus", syncWindowUsers);
}
