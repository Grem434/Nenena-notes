// apps/web/src/lib/notesRealtime.js
import { supabase } from "@/lib/supabaseClient";

/**
 * Suscribe a cambios en la tabla 'notes'
 * - DELETE  -> aplica 'hard_delete' en local
 * - UPDATE (deleted true/false) -> aplica soft delete/restore
 */
export function startNotesRealtime({ onHardDelete, onSoftDelete, onRestore }) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel("notes-realtime")
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

  return () => {
    try { supabase.removeChannel(channel); } catch {}
  };
}
