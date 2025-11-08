import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useNotesStore } from "@/store/useNotesStore";
import { useUsersStore } from "@/store/useUsersStore";
import { notify } from "@/lib/notify";

function toDateInputValue(iso) {
  if (!iso) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

export default function NoteModal({ open, onOpenChange, onSave, editingNote }) {
  const users = useUsersStore((s) => s.users || []);
  const addNote = useNotesStore((s) => s.addNote);
  const updateNote = useNotesStore((s) => s.updateNote);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState(""); // YYYY-MM-DD

  const [submitting, setSubmitting] = useState(false);
  const lastSubmitAtRef = useRef(0);

  const isEditing = Boolean(editingNote);
  const isMobile = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(max-width: 768px)").matches,
    [open]
  );

  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (editingNote) {
      setFrom(editingNote.from || "");
      setTo(editingNote.to || "");
      setText(editingNote.text || "");
      setDueDate(toDateInputValue(editingNote.dueAt));
    } else {
      setFrom("");
      setTo("");
      setText("");
      setDueDate("");
    }
  }, [editingNote, open]);

  useEffect(() => {
    if (open && firstFieldRef.current) {
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const handleClose = () => onOpenChange?.(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;
    const now = Date.now();
    if (now - lastSubmitAtRef.current < 800) return; // cooldown anti-doble tap
    lastSubmitAtRef.current = now;

    if (!from || !to) {
      notify({ variant: "warning", title: "Selecciona De y Para" });
      return;
    }

    setSubmitting(true);
    const payload = { from, to, text, dueAt: dueDate || null };

    try {
      if (isEditing) {
        updateNote(editingNote.id, payload);
        notify({ variant: "success", title: "Nota actualizada" });
      } else {
        addNote(payload);
        notify({ variant: "success", title: "Nota creada" });
        onSave?.(payload);
      }
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  const userOptions = [{ name: "— Selecciona —" }, ...users];

  return (
    <div
      className={`fixed inset-0 z-[100] ${isMobile ? "" : "flex items-center justify-center"} bg-black/30`}
      role="dialog"
      aria-modal="true"
      onKeyDown={(e) => e.key === "Escape" && handleClose()}
      // si clicas en el fondo, cerramos
      onClick={handleClose}
    >
      <form
        onSubmit={handleSubmit}
        // 👇 esto evita que el click dentro cierre el modal en móvil
        onClick={(e) => e.stopPropagation()}
        className={[
          "bg-white shadow-xl border border-slate-200",
          "flex flex-col",
          isMobile ? "fixed inset-0 rounded-none" : "w-full max-w-lg rounded-2xl mx-4 my-6",
        ].join(" ")}
      >
        <div
          className={
            isMobile
              ? "px-4 py-3 border-b border-slate-200 sticky top-0 bg-white z-10"
              : "px-5 py-4 border-b border-slate-200"
          }
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800">
              {isEditing ? "Editar nota" : "Nueva nota"}
            </h3>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-slate-100 text-slate-600"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className={isMobile ? "flex-1 overflow-y-auto px-4 py-4" : "px-5 py-4"}>
          <div className={isMobile ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
            <div className={isMobile ? "" : "col-span-1"}>
              <label className="block text-xs text-slate-500 mb-1">De</label>
              <select
                ref={firstFieldRef}
                className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                required
              >
                {userOptions.map((u) => (
                  <option key={u.name} value={u.name === "— Selecciona —" ? "" : u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={isMobile ? "" : "col-span-1"}>
              <label className="block text-xs text-slate-500 mb-1">Para</label>
              <select
                className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                required
              >
                {userOptions.map((u) => (
                  <option key={u.name} value={u.name === "— Selecciona —" ? "" : u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={isMobile ? "col-span-1" : "col-span-2"}>
              <label className="block text-xs text-slate-500 mb-1">Contenido</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-pink-200"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Escribe la nota…"
                rows={isMobile ? 6 : 5}
              />
            </div>

            <div className={isMobile ? "col-span-1" : "col-span-2"}>
              <label className="block text-xs text-slate-500 mb-1">Vencimiento</label>
              <input
                type="date"
                className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>

        <div
          className={
            isMobile
              ? "px-4 py-3 border-t border-slate-200 sticky bottom-0 bg-white z-10"
              : "px-5 py-4 border-t border-slate-200"
          }
        >
          <div className={isMobile ? "grid grid-cols-2 gap-2" : "flex justify-end gap-2"}>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-60"
            >
              {isEditing ? "Guardar cambios" : submitting ? "Creando…" : "Crear nota"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
