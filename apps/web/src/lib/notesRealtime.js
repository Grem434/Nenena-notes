// apps/web/src/lib/notesRealtime.js
import { getSupabase } from "@/lib/supabaseClient";
import { shouldPlayIncomingChime, playNoteChime } from "@/lib/realtimeChimes";

/**
 * Suscribe a cambios en la tabla 'notes' usando un canal propio,
 * separado del canal de sync general, para evitar colisiones.
 *
 * Callbacks opcionales:
 *  - onInsert(row)       -> creación remota (si quieres reflejar en el store)
 *  - onSoftDelete(id,row)-> UPDATE con deleted=true
 *  - onRestore(id,row)   -> UPDATE con deleted=false
 *  - onHardDelete(id)    -> DELETE hard
 *
 * Chimes:
 *  - Sólo suenan en este cliente si NO fue quien originó la operación
 *    (se evita eco con markLocalNoteTouch/shouldPlayIncomingChime).
 */
export function startNotesRealtime({ onInsert, onHardDelete, onSoftDelete, onRestore } = {}) {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  // Canal dedicado (no reutiliza el de sync)
  const channel = supabase
    .channel("notes-realtime-lite")

    // INSERT (nota nueva)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notes" },
      (payload) => {
        const row = payload?.new;
        if (!row?.id) return;

        // Tu lógica de inserción remota (si quieres actualizar el store aquí)
        onInsert?.(row);

        // Chime sólo si no es eco local
        if (shouldPlayIncomingChime(row.id)) playNoteChime("created");
      }
    )

    // UPDATE (soft delete / restore)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "notes" },
      (payload) => {
        const row = payload?.new;
        if (!row?.id) return;

        // Soft delete
        if (row.deleted === true) {
          onSoftDelete?.(row.id, row);
          if (shouldPlayIncomingChime(row.id)) playNoteChime("deleted");
          return;
        }

        // Restore
        if (row.deleted === false) {
          onRestore?.(row.id, row);
          if (shouldPlayIncomingChime(row.id)) playNoteChime("updated");
          return;
        }

        // Si en el futuro quieres chime para “update normal”, puedes descomentar:
        // if (shouldPlayIncomingChime(row.id)) playNoteChime("updated");
      }
    )

    // DELETE (hard delete)
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "notes" },
      (payload) => {
        const id = payload?.old?.id;
        if (!id) return;

        onHardDelete?.(id);
        if (shouldPlayIncomingChime(id)) playNoteChime("deleted");
      }
    )
    .subscribe();

  // Re-suscripción defensiva al recuperar visibilidad (algunos navegadores pausan sockets)
  const onVisible = () => {
    try {
      if (document.visibilityState === "visible") {
        // supabase-js reintenta internamente; dejamos esto como cinturón y tirantes
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
