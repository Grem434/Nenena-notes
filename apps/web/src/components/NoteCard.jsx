import React from "react";
import { Trash2, Archive, CheckCircle2, MessageSquare } from "lucide-react";
import { useNotesStore } from "@/store/useNotesStore";
import { cn } from "@/components/ui/utils";

export default function NoteCard({ note, onOpen, compact = false }) {
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const toggleArchive = useNotesStore((s) => s.toggleArchive);
  const toggleResolved = useNotesStore((s) => s.toggleResolved);

  const repliesCount = Array.isArray(note.replies) ? note.replies.length : 0;

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNote(note.id); // 👈 siempre a papelera
  };

  const handleArchive = (e) => {
    e.stopPropagation();
    toggleArchive(note.id);
  };

  const handleResolved = (e) => {
    e.stopPropagation();
    toggleResolved(note.id);
  };

  return (
    <article
      onClick={() => onOpen?.(note)}
      className={cn(
        "group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden",
        compact ? "min-h-[120px]" : "min-h-[160px]"
      )}
    >
      {/* franja superior */}
      <div className="flex items-start justify-between gap-2 px-3 pt-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            De: <span className="text-slate-700">{note.from}</span>
          </p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            Para: <span className="text-slate-700">{note.to}</span>
          </p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={handleResolved}
            className={cn(
              "p-1.5 rounded-full hover:bg-slate-100",
              note.resolved && "text-emerald-500"
            )}
            title="Marcar resuelta"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleArchive}
            className="p-1.5 rounded-full hover:bg-slate-100"
            title={note.archived ? "Desarchivar" : "Archivar"}
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-full hover:bg-slate-100 text-rose-500"
            title="Mover a papelera"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* contenido */}
      <div className="px-3 py-2 flex-1">
        <p className="text-sm text-slate-700 whitespace-pre-line line-clamp-4">
          {note.text}
        </p>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        {repliesCount > 0 ? (
          <div className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 rounded-full px-2 py-0.5">
            <MessageSquare className="w-3 h-3" />
            {repliesCount} respuesta{repliesCount > 1 ? "s" : ""}
          </div>
        ) : (
          <span className="text-[10px] text-slate-300">Sin respuestas</span>
        )}

        {note.dueAt ? (
          <span className="text-[10px] text-slate-400">
            vence {new Date(note.dueAt).toLocaleDateString()}
          </span>
        ) : null}
      </div>
    </article>
  );
}
