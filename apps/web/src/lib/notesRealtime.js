// apps/web/src/lib/notesRealtime.js
import { getSupabase } from "@/lib/supabaseClient";

/**
 * Suscribe a cambios en la tabla 'notes' usando un canal propio,
 * separado del canal de sync general, para evitar colisiones.
 * - DELETE  -> aplica 'hard_delete' en local
 * - UPDATE (deleted true/false) -> aplica soft delete/restore
 */
export function startNotesRealtime({ onHardDelete, onSoftDelete, onRestore }) {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  // ⚠️ usa un nombre de canal distinto al de sync.js
  const channel = supabase
    .channel("notes-realtime-lite")
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "notes" },
      (payload) => {
        const id = payload?.old?.id;
        if (id) onHardDelete?.(id);
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "notes" },
      (payload) => {
        const row = payload?.new;
        if (!row?.id) return;
        if (row.deleted === true) onSoftDelete?.(row.id, row);
        if (row.deleted === false) onRestore?.(row.id, row);
      }
    )
    .subscribe();

  // Re-suscribe al recuperar visibilidad si fuera necesario (iOS puede pausar sockets)
  const onVisible = () => {
    try {
      if (document.visibilityState === "visible") {
        // Nada que hacer si sigue activo; si el runtime cerró el canal, crear otro
        // (supabase-js cierra internamente y reintenta, esto es un "belt & suspenders")
        // No disponemos de un estado público del canal, así que nos limitamos a no hacer nada aquí.
      }
    } catch {}
  };
  try {
    document.addEventListener("visibilitychange", onVisible);
  } catch {}

  return () => {
    try { document.removeEventListener("visibilitychange", onVisible); } catch {}
    try { supabase.removeChannel(channel); } catch {}
  };
}
