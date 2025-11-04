import { useMemo, useState, useEffect, useRef } from "react";
import { useUIStore } from "@/store/useUIStore";
import { useNotesStore } from "@/store/useNotesStore";
import { toast } from "sonner";
import { CheckCircle2, Undo2, Archive, ArchiveRestore, Trash2, Save, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ===== Utilidades fecha ===== */
const fmtShort = (iso) => {
  try {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + "T12:00:00") : new Date(iso);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  } catch { return ""; }
};
const fmtFull = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-ES", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
};
const toDateInput = (v) => {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  try {
    const d = new Date(v), pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  } catch { return ""; }
};

const nowISO = () => new Date().toISOString();
const uuid = () => (crypto?.randomUUID?.() ? crypto.randomUUID() : String(Date.now()));

export default function NoteFocus() {
  const { focusedNoteId, setFocusedNote } = useUIStore();
  const notes = useNotesStore((s) => s.notes);

  const updateNote   = useNotesStore((s) => s.updateNote);
  const toggleStatus = useNotesStore((s) => s.toggleStatus);
  const archiveNote  = useNotesStore((s) => s.archiveNote);
  const unarchiveNote= useNotesStore((s) => s.unarchiveNote);
  const deleteNote   = useNotesStore((s) => s.deleteNote);
  const restoreNote  = useNotesStore((s) => s.restoreNote);
  const hardRemove   = useNotesStore((s) => s.hardRemove);
  const markRead     = useNotesStore((s) => s.markRead);
  const addReply     = useNotesStore((s) => s.addReply);

  const note = useMemo(() => notes.find((n) => n.id === focusedNoteId), [notes, focusedNoteId]);

  const [text, setText] = useState("");
  const [dueDate, setDueDateLocal] = useState("");
  const [replyText, setReplyText] = useState("");
  const [localReplies, setLocalReplies] = useState([]);
  const [sendingReply, setSendingReply] = useState(false);
  const replyRef = useRef(null);

  const prevRef = useRef(null);
  const clone = (o)=>{ try { return structuredClone(o); } catch { return JSON.parse(JSON.stringify(o)); } };

  /* ===== Carga de estados al abrir ===== */
  useEffect(() => {
    if (note?.id) {
      setText(note.text || "");
      setDueDateLocal(toDateInput(note.dueAt));
      setReplyText("");
      setLocalReplies(Array.isArray(note.replies) ? note.replies : []);
      prevRef.current = clone(note);
      markRead(note.id);
    } else {
      setText(""); setDueDateLocal(""); setReplyText(""); setLocalReplies([]); prevRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  /* Sincroniza si la store cambia (realtime, etc.) */
  useEffect(() => {
    if (!note) return;
    setLocalReplies(Array.isArray(note.replies) ? note.replies : []);
  }, [note?.replies, note?.updatedAt]);

  /* ===== Enviar respuesta (usada también de forma automática) ===== */
  const doSendReply = () => {
    if (!note?.id) return false;
    const trimmed = (replyText || "").trim();
    if (!trimmed || sendingReply) return false;

    setSendingReply(true);

    const author = note.to || "—";
    const newReply = { id: uuid(), author, text: trimmed, createdAt: nowISO() };

    // Optimismo local inmediato
    const optimistic = [...(Array.isArray(localReplies) ? localReplies : []), newReply];
    setLocalReplies(optimistic);
    setReplyText("");

    // Store
    try { addReply(note.id, { author, text: trimmed }); } catch {}

    setSendingReply(false);
    return true;
  };

  /* ===== Cierre seguro: si hay texto en respuesta, lo envía antes ===== */
  const safeClose = () => {
    const sent = doSendReply(); // si hay texto pendiente, lo guarda primero
    setFocusedNote(null);
    if (sent) toast.success("Respuesta guardada");
  };

  /* ===== Acciones cabecera (guardan respuesta pendiente antes) ===== */
  const onSave = () => {
    if (!note?.id) return;
    const sent = doSendReply(); // guarda respuesta si existe
    const before = clone(prevRef.current || note);
    const patch = { text, dueAt: dueDate || null };
    updateNote(note.id, patch);
    setFocusedNote(null);
    toast.success(sent ? "Nota y respuesta guardadas" : "Cambios guardados");
    // Deshacer simple del texto (mantiene la respuesta)
    // (si necesitas undo completo, puedo ampliarlo)
  };

  const onToggle = () => {
    if (!note?.id) return;
    doSendReply();
    toggleStatus(note.id);
    setFocusedNote(null);
    toast.success(note.status === "pendiente" ? "Nota marcada como resuelta" : "Nota marcada como pendiente");
  };

  const onArchive = () => {
    if (!note?.id) return;
    doSendReply();
    note.archived ? unarchiveNote(note.id) : archiveNote(note.id);
    setFocusedNote(null);
    toast.success(note.archived ? "Nota desarchivada" : "Nota archivada");
  };

  const onDelete = () => {
    if (!note?.id) return;
    doSendReply();
    note.deleted ? restoreNote(note.id) : deleteNote(note.id);
    setFocusedNote(null);
    toast.success(note.deleted ? "Nota recuperada" : "Nota a papelera");
  };

  const onHardRemove = () => {
    if (!note?.id) return;
    doSendReply();
    hardRemove(note.id);
    setFocusedNote(null);
    toast.success("Nota eliminada definitivamente");
  };

  const onReplyKeyDown = (e) => {
    const isCtrlEnter = (e.ctrlKey || e.metaKey) && e.key === "Enter";
    const isPlainEnter = !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && e.key === "Enter";
    if (isCtrlEnter || isPlainEnter) { e.preventDefault(); doSendReply(); }
  };

  if (!note) return null;
  const isPersonal = note.from && note.to && note.from === note.to;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/30 md:bg-black/30 flex items-stretch md:items-center justify-center md:p-4"
      role="dialog"
      aria-modal="true"
      onClick={safeClose}
    >
      {/* Contenedor: bloquea burbujeo también en down/touch */}
      <div
        className={cn(
          "relative w-full md:max-w-2xl md:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden",
          "md:h-auto h-full"
        )}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
          <div className="md:hidden h-5 grid place-items-center">
            <div className="h-1.5 w-12 rounded-full bg-slate-200" />
          </div>

          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 truncate">
                Nota de {note.from} → {note.to}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Creada: {fmtShort(note.createdAt)}
                {note.dueAt ? ` · Vence: ${fmtShort(note.dueAt)}` : ""}
                {note.readAt ? ` · Leída: ${fmtFull(note.readAt)}` : ""}
                {isPersonal && " · Personal"}
              </p>
            </div>

            {/* Acciones desktop */}
            <div className="hidden md:flex items-center gap-1.5">
              <button type="button" onClick={onToggle}
                className={cn("inline-flex items-center justify-center w-9 h-9 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-pink-300",
                note.status === "pendiente" ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "border-slate-200 text-slate-700 hover:bg-slate-50")}
                title={note.status === "pendiente" ? "Marcar resuelta" : "Marcar pendiente"} aria-label="Toggle estado"
                onMouseDown={(e)=>e.stopPropagation()} onTouchStart={(e)=>e.stopPropagation()}>
                <CheckCircle2 className="w-5 h-5" />
              </button>

              {note.archived ? (
                <button type="button" onClick={onArchive} className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-pink-300"
                  title="Desarchivar" aria-label="Desarchivar" onMouseDown={(e)=>e.stopPropagation()} onTouchStart={(e)=>e.stopPropagation()}>
                  <ArchiveRestore className="w-5 h-5" />
                </button>
              ) : (
                <button type="button" onClick={onArchive} className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-pink-300"
                  title="Archivar" aria-label="Archivar" onMouseDown={(e)=>e.stopPropagation()} onTouchStart={(e)=>e.stopPropagation()}>
                  <Archive className="w-5 h-5" />
                </button>
              )}

              <button type="button" onClick={onDelete}
                className={cn("inline-flex items-center justify-center w-9 h-9 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-pink-300",
                note.deleted ? "border-amber-300 text-amber-800 hover:bg-amber-50" : "border-rose-300 text-rose-700 hover:bg-rose-50")}
                title={note.deleted ? "Recuperar" : "Papelera"} aria-label="Papelera"
                onMouseDown={(e)=>e.stopPropagation()} onTouchStart={(e)=>e.stopPropagation()}>
                {note.deleted ? <Undo2 className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
              </button>

              <button type="button" onClick={onSave}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition focus:outline-none focus:ring-2 focus:ring-pink-300"
                title="Guardar cambios" aria-label="Guardar"
                onMouseDown={(e)=>e.stopPropagation()} onTouchStart={(e)=>e.stopPropagation()}>
                <Save className="w-5 h-5" />
              </button>

              <button type="button" onClick={safeClose}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-pink-300"
                title="Cerrar" aria-label="Cerrar"
                onMouseDown={(e)=>e.stopPropagation()} onTouchStart={(e)=>e.stopPropagation()}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="relative h-[calc(100dvh-56px-64px)] md:h-auto overflow-y-auto px-4 py-4 md:py-5 space-y-4">
          <div className="relative z-0">
            <label className="block text-xs text-slate-500 mb-1">Mensaje</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-[140px] md:min-h-[160px] focus:outline-none focus:ring-2 focus:ring-pink-300"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe la nota…"
              onMouseDown={(e)=>e.stopPropagation()}
              onTouchStart={(e)=>e.stopPropagation()}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Fecha de vencimiento</label>
              <input
                type="date"
                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                value={dueDate}
                onChange={(e) => setDueDateLocal(e.target.value)}
                onMouseDown={(e)=>e.stopPropagation()}
                onTouchStart={(e)=>e.stopPropagation()}
              />
              <p className="text-[11px] text-slate-500 mt-1">Déjalo vacío si no quieres vencimiento.</p>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Estado de lectura</label>
              <div className="text-[12px] text-slate-600 border rounded-lg px-2 py-1.5 bg-slate-50">
                {note.readAt ? `Leída: {${fmtFull(note.readAt)}}` : "No leída"}
              </div>
            </div>
          </div>

          {/* Hilo */}
          <div className="pt-1">
            <h4 className="text-sm font-semibold text-slate-800 mb-2">Respuestas</h4>

            {Array.isArray(localReplies) && localReplies.length > 0 ? (
              <ul className="space-y-2 mb-3">
                {localReplies.map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-xs text-slate-500 mb-1">{r.author} · {fmtShort(r.createdAt)}</div>
                    <div className="text-sm text-slate-800 whitespace-pre-wrap">{r.text}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 mb-3">Aún no hay respuestas.</p>
            )}

            <div className="rounded-xl border border-slate-200 bg-white"
                 onMouseDown={(e)=>e.stopPropagation()}
                 onTouchStart={(e)=>e.stopPropagation()}>
              <div className="px-3 py-2 border-b border-slate-200 text-xs text-slate-500">
                Responder como <span className="font-medium">{note.to}</span>
              </div>
              <div className="p-3">
                <textarea
                  ref={replyRef}
                  className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-pink-300"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={onReplyKeyDown}
                  placeholder="Escribe tu respuesta…"
                  onBlur={() => { /* auto-guardar al salir del campo en móvil */ doSendReply(); }}
                  onMouseDown={(e)=>e.stopPropagation()}
                  onTouchStart={(e)=>e.stopPropagation()}
                />
                <div className="flex items-center justify-end mt-2">
                  <button
                    type="button"
                    onClick={(e)=>{ e.stopPropagation(); doSendReply(); }}
                    onMouseDown={(e)=>e.stopPropagation()}
                    onTouchStart={(e)=>e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    disabled={sendingReply}
                  >
                    <Send className="w-4 h-4" /> {sendingReply ? "Enviando…" : "Enviar respuesta"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barra inferior móvil */}
        <div className="md:hidden sticky bottom-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200"
             onMouseDown={(e)=>e.stopPropagation()}
             onTouchStart={(e)=>e.stopPropagation()}>
          <div className="px-3 py-2 grid grid-cols-4 gap-2">
            <button onClick={(e)=>{e.stopPropagation(); onToggle();}}
              className={cn("h-10 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-300",
              note.status === "pendiente" ? "border-emerald-300 text-emerald-700 bg-emerald-50":"border-slate-300 text-slate-700 bg-white")}>
              {note.status === "pendiente" ? "Resuelta" : "Pendiente"}
            </button>
            <button onClick={(e)=>{e.stopPropagation(); onArchive();}}
              className="h-10 rounded-xl border border-sky-300 text-sky-700 bg-sky-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-300">
              {note.archived ? "Desarchivar" : "Archivar"}
            </button>
            <button onClick={(e)=>{e.stopPropagation(); onDelete();}}
              className={cn("h-10 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-300",
              note.deleted ? "border-amber-300 text-amber-800 bg-amber-50":"border-rose-300 text-rose-700 bg-rose-50")}>
              {note.deleted ? "Recuperar" : "Papelera"}
            </button>
            <button onClick={(e)=>{e.stopPropagation(); onSave();}}
              className="h-10 rounded-xl bg-pink-500 text-white text-sm font-medium hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-300">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
