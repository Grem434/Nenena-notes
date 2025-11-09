import React, { useState } from "react";
import { X, Trash2, Archive, CheckCircle2 } from "lucide-react";
import { useNotesStore } from "@/store/useNotesStore";
import { useUIStore } from "@/store/useUIStore";

export default function NoteFocus() {
  const { focusedNoteId, clearFocusedNote } = useUIStore();
  const notes = useNotesStore((s) => s.notes ?? []);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const archiveNote = useNotesStore((s) => s.archiveNote);
  const unarchiveNote = useNotesStore((s) => s.unarchiveNote);
  const toggleStatus = useNotesStore((s) => s.toggleStatus);
  const addReply = useNotesStore((s) => s.addReply);

  const note = notes.find((n) => n.id === focusedNoteId) || null;
  const [replyText, setReplyText] = useState("");

  if (!focusedNoteId || !note) return null;

  const handleClose = () => {
    clearFocusedNote();
    setReplyText("");
  };

  const handleDelete = () => {
    // Papelera siempre
    deleteNote(note.id);
    handleClose();
  };

  const handleArchive = () => {
    if (note.archived) {
      unarchiveNote(note.id);
    } else {
      archiveNote(note.id);
    }
  };

  const handleResolved = () => {
    toggleStatus(note.id);
  };

  const handleAddReply = (e) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text) return;
    addReply(note.id, {
      // seguimos usando el from de la nota como autor por ahora
      author: note.from,
      text,
    });
    setReplyText("");
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/30 flex items-center justify-center px-2 md:px-0">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-400">
              De <span className="text-slate-700">{note.from}</span> para{" "}
              <span className="text-slate-700">{note.to}</span>
            </p>
            <h2 className="text-lg font-semibold text-slate-800 mt-1">
              Nota
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleResolved}
              className={`p-2 rounded-full hover:bg-slate-100 ${
                note.status === "resuelta"
                  ? "text-emerald-500"
                  : "text-slate-500"
              }`}
              title="Marcar resuelta"
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleArchive}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
              title={note.archived ? "Desarchivar" : "Archivar"}
            >
              <Archive className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-full hover:bg-slate-100 text-rose-500"
              title="Mover a papelera"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-sm text-slate-700 whitespace-pre-line">
            {note.text}
          </p>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-2">
              Respuestas
            </h3>
            {Array.isArray(note.replies) && note.replies.length > 0 ? (
              <ul className="space-y-2">
                {note.replies.map((r, idx) => (
                  <li
                    key={r.id || r.createdAt || idx}
                    className="bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-700"
                  >
                    <p className="text-[11px] text-slate-400 mb-1">
                      {r.author || "—"}
                    </p>
                    {r.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">Sin respuestas</p>
            )}
          </div>
        </div>

        <form
          onSubmit={handleAddReply}
          className="border-t border-slate-100 px-5 py-3 flex gap-2"
        >
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
            placeholder="Responder…"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-pink-500 text-white text-sm hover:bg-pink-600"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
