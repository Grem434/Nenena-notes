import React, { useState } from "react";
import { Trash2, Undo2, Archive, CheckCircle2 } from "lucide-react";
import { useNotesStore } from "@/store/useNotesStore";
import { useUIStore } from "@/store/useUIStore";

// Verificación de build
console.log(
  "[NoteFocus] build",
  (import.meta && import.meta.env && import.meta.env.VITE_BUILD_ID) || "dev"
);

function formatShortDM(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
}

export default function NoteFocus() {
  const { focusedNoteId, clearFocusedNote } = useUIStore();
  const {
    notes,
    deleteNote,
    restoreNote,
    hardRemove,
    archiveNote,
    unarchiveNote,
    toggleStatus,
    addReply,
  } = useNotesStore((s) => ({
    notes: s.notes ?? [],
    deleteNote: s.deleteNote,
    restoreNote: s.restoreNote,
    hardRemove: s.hardRemove,
    archiveNote: s.archiveNote,
    unarchiveNote: s.unarchiveNote,
    toggleStatus: s.toggleStatus,
    addReply: s.addReply,
  }));

  const note = notes.find((n) => n.id === focusedNoteId) || null;
  const [replyText, setReplyText] = useState("");
  if (!focusedNoteId || !note) return null;

  const close = () => {
    clearFocusedNote();
    setReplyText("");
  };

  const handleSoftDelete = () => {
    if (!note.deleted) {
      deleteNote(note.id);
      close();
    }
  };
  const handleArchive = () => {
    if (note.archived) unarchiveNote(note.id);
    else archiveNote(note.id);
  };
  const handleResolved = () => {
    toggleStatus(note.id);
  };
  const handleAddReply = (e) => {
    e.preventDefault();
    const t = replyText.trim();
    if (!t) return;
    addReply(note.id, { author: note.from, text: t });
    setReplyText("");
  };

  const HeaderActions = () => {
    if (note.deleted) {
      // 🔴 PAPELERA: SOLO Restaurar y Eliminar definitivamente
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              restoreNote(note.id);
              close();
            }}
            className="p-2 rounded-full hover:bg-slate-100 text-sky-700"
            title="Restaurar"
            aria-label="Restaurar"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              hardRemove(note.id);
              close();
            }}
            className="p-2 rounded-full hover:bg-slate-100 text-rose-700"
            title="Eliminar definitivamente"
            aria-label="Eliminar definitivamente"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      );
    }
    // Estado normal (NO papelera)
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleResolved}
          className={`p-2 rounded-full hover:bg-slate-100 ${
            note.status === "resuelta" ? "text-emerald-500" : "text-slate-500"
          }`}
          title="Marcar resuelta"
          aria-label="Marcar resuelta"
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleArchive}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
          title={note.archived ? "Desarchivar" : "Archivar"}
          aria-label={note.archived ? "Desarchivar" : "Archivar"}
        >
          <Archive className="w-5 h-5" />
        </button>
        <button
          onClick={handleSoftDelete}
          className="p-2 rounded-full hover:bg-slate-100 text-rose-500"
          title="Mover a papelera"
          aria-label="Mover a papelera"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={close}
        aria-label="Cerrar"
      />
      <div className="absolute inset-x-0 md:inset-auto md:left-1/2 md:-translate-x-1/2 top-[8vh] md:top-[10vh] w-full md:w-[720px] bg-white rounded-2xl shadow-xl max-h-[84vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-xs text-slate-400">
              De <span className="text-slate-700">{note.from || "—"}</span> para{" "}
              <span className="text-slate-700">{note.to || "—"}</span>
            </p>
            <div className="mt-1 text-[11px] text-slate-500">
              <span className="mr-2">
                Estado:{" "}
                <strong className={note.status === "resuelta" ? "text-emerald-600" : "text-amber-700"}>
                  {note.status || "pendiente"}
                </strong>
              </span>
              <span className="mr-2">Creada: {formatShortDM(note.createdAt)}</span>
              <span>Actualizada: {formatShortDM(note.updatedAt)}</span>
              {note.archived && <span className="ml-2 text-slate-400">· Archivada</span>}
              {note.deleted && <span className="ml-2 text-rose-500">· En papelera</span>}
            </div>
          </div>
          <HeaderActions />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-sm text-slate-700 whitespace-pre-line">
            {note.text || <em className="text-slate-400">Sin texto…</em>}
          </p>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-2">Respuestas</h3>
            {Array.isArray(note.replies) && note.replies.length > 0 ? (
              <ul className="space-y-2">
                {note.replies.map((r, idx) => (
                  <li
                    key={r.id || r.createdAt || idx}
                    className="bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-700"
                  >
                    <p className="text-[11px] text-slate-400 mb-0.5">{r.author || "—"}</p>
                    {r.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">Sin respuestas</p>
            )}
          </div>
        </div>

        <form onSubmit={handleAddReply} className="border-t border-slate-100 px-5 py-3 flex gap-2">
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
