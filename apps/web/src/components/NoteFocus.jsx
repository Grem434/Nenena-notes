import React, { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Undo2, Archive, CheckCircle2, Calendar, X, Mic } from "lucide-react";
import { useNotesStore } from "@/store/useNotesStore";
import { useUIStore } from "@/store/useUIStore";

/* ===== utilidades de fecha ===== */
function formatShortDM(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
}
function formatDateOnly(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function isoToDateInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function dateInputToIso(yyyy_mm_dd) {
  if (!yyyy_mm_dd) return null;
  const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, 23, 59, 59, 0);
  return dt.toISOString();
}

/* ===== compat dictado ===== */
function hasSpeechRecognition() {
  if (typeof window === "undefined") return false;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  return !!SR;
}
function isIOSWebKit() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isWebKit = /WebKit/.test(ua);
  return isIOS && isWebKit;
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
    updateNote,
  } = useNotesStore((s) => ({
    notes: s.notes ?? [],
    deleteNote: s.deleteNote,
    restoreNote: s.restoreNote,
    hardRemove: s.hardRemove,
    archiveNote: s.archiveNote,
    unarchiveNote: s.unarchiveNote,
    toggleStatus: s.toggleStatus,
    addReply: s.addReply,
    updateNote: s.updateNote,
  }));

  const note = useMemo(
    () => notes.find((n) => n && n.id === focusedNoteId) || null,
    [notes, focusedNoteId]
  );

  const [textDraft, setTextDraft] = useState(note?.text ?? "");
  const [replyText, setReplyText] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const endSilenceTimer = useRef(null);

  const speechSupported = hasSpeechRecognition();
  const forceDisableSpeech = isIOSWebKit();

  useEffect(() => {
    setTextDraft(note?.text ?? "");
  }, [note?.id]);

  // ESC cierra sin guardar
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeWithoutSave();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);

  if (!focusedNoteId || !note) return null;

  const closeWithoutSave = () => {
    // no persiste textDraft
    stopMicIfAny();
    clearFocusedNote();
    setReplyText("");
  };

  const closeAfterSaveText = () => {
    // guarda text y cierra
    const next = (textDraft ?? "").replace(/\s+$/, "");
    if (next !== (note.text ?? "")) {
      updateNote(note.id, { text: next });
    }
    stopMicIfAny();
    clearFocusedNote();
    setReplyText("");
  };

  const stopMicIfAny = () => {
    try {
      if (recognitionRef.current && listening) recognitionRef.current.stop?.();
    } catch {}
    setListening(false);
  };

  /* ===== header actions ===== */
  const handleSoftDelete = () => {
    if (!note.deleted) {
      deleteNote(note.id);
      closeWithoutSave();
    }
  };
  const handleArchive = () => {
    if (note.archived) unarchiveNote(note.id);
    else archiveNote(note.id);
  };
  const handleResolved = () => {
    toggleStatus(note.id);
  };

  /* ===== dueAt ===== */
  const dueInputValue = isoToDateInput(note.dueAt);
  const handleDueChange = (e) => {
    const iso = dateInputToIso(e.target.value);
    updateNote(note.id, { dueAt: iso });
  };
  const clearDue = () => updateNote(note.id, { dueAt: null });

  /* ===== respuestas ===== */
  const handleAddReply = (e) => {
    e.preventDefault();
    const t = replyText.trim();
    if (!t) return;
    addReply(note.id, { author: note.from, text: t });
    setReplyText("");
    closeWithoutSave(); // enviar respuesta cierra (sin tocar textDraft)
  };

  /* ===== dictado: auto-stop ===== */
  const startVoiceOnce = () => {
    const SR =
      (typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)) ||
      null;
    if (!SR) return;

    if (listening) {
      try { recognitionRef.current?.stop(); } catch {}
      setListening(false);
      return;
    }

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "es-ES";
    rec.continuous = false;
    rec.interimResults = false;

    const stopSafely = () => { try { rec.stop(); } catch {} };

    rec.onstart = () => {
      setListening(true);
      if (endSilenceTimer.current) clearTimeout(endSilenceTimer.current);
      endSilenceTimer.current = setTimeout(stopSafely, 20000);
    };
    rec.onresult = (ev) => {
      let finalText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) finalText += (res[0]?.transcript || "") + " ";
      }
      if (finalText) {
        setReplyText((prev) => (prev ? `${prev} ${finalText.trim()}` : finalText.trim()));
      }
    };
    rec.onspeechend = () => { stopSafely(); };
    rec.onerror = () => { stopSafely(); setListening(false); };
    rec.onend = () => {
      if (endSilenceTimer.current) { clearTimeout(endSilenceTimer.current); endSilenceTimer.current = null; }
      setListening(false);
    };

    try { rec.start(); } catch { setListening(false); }
  };

  /* ===== header actions (condicional por papelera) ===== */
  const HeaderActions = () => {
    if (note.deleted) {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { restoreNote(note.id); closeWithoutSave(); }}
            className="p-2 rounded-full hover:bg-slate-100 text-sky-700"
            title="Restaurar" aria-label="Restaurar"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => { hardRemove(note.id); closeWithoutSave(); }}
            className="p-2 rounded-full hover:bg-slate-100 text-rose-700"
            title="Eliminar definitivamente" aria-label="Eliminar definitivamente"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleResolved}
          className={`p-2 rounded-full hover:bg-slate-100 ${note.status === "resuelta" ? "text-emerald-500" : "text-slate-500"}`}
          title="Marcar resuelta" aria-label="Marcar resuelta"
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleArchive}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
          title={note.archived ? "Desarchivar" : "Archivar"} aria-label={note.archived ? "Desarchivar" : "Archivar"}
        >
          <Archive className="w-5 h-5" />
        </button>
        <button
          onClick={handleSoftDelete}
          className="p-2 rounded-full hover:bg-slate-100 text-rose-500"
          title="Mover a papelera" aria-label="Mover a papelera"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[120]">
      {/* backdrop (tocar fuera cierra sin guardar) */}
      <button className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={closeWithoutSave} aria-label="Cerrar" />

      <div className="absolute inset-x-0 md:inset-auto md:left-1/2 md:-translate-x-1/2 top-[8vh] md:top-[10vh] w-full md:w-[760px] bg-white rounded-2xl shadow-xl max-h-[84vh] overflow-hidden flex flex-col">
        {/* Header */}
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

          {/* Acciones + aspa cerrar sin guardar */}
          <div className="flex items-center gap-1">
            <HeaderActions />
            <button
              onClick={closeWithoutSave}
              className="ml-1 p-2 rounded-full hover:bg-slate-100 text-slate-500"
              title="Cerrar sin guardar" aria-label="Cerrar sin guardar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Fecha tope de resolución */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <label className="text-xs font-semibold text-slate-600">Fecha de resolución (opcional):</label>
            <input
              type="date"
              value={dueInputValue}
              onChange={handleDueChange}
              disabled={!!note.deleted}
              className="ml-2 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 disabled:opacity-60"
            />
            {dueInputValue ? (
              <button
                type="button" onClick={clearDue} disabled={!!note.deleted}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border border-slate-200 hover:bg-slate-50 disabled:opacity-60"
                title="Quitar fecha"
              >
                <X className="w-3 h-3" /> Quitar fecha
              </button>
            ) : (
              <span className="text-[11px] text-slate-400">
                {note.deleted ? "—" : "Sin fecha de resolución tope"}
              </span>
            )}
          </div>

          {/* Texto editable (sin guardar automático) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Texto de la nota</label>
            <textarea
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              disabled={!!note.deleted}
              className="w-full min-h-[120px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-200 disabled:opacity-60"
              placeholder="Escribe o edita la nota…"
            />
          </div>

          {/* Respuestas (con fecha sin hora) */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-2">Respuestas</h3>
            {Array.isArray(note.replies) && note.replies.length > 0 ? (
              <ul className="space-y-2">
                {note.replies.map((r, idx) => (
                  <li key={r.id || r.createdAt || idx} className="bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-700">
                    <p className="text-[11px] text-slate-400 mb-0.5">
                      {r.author || "—"} · {formatDateOnly(r.createdAt)}
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

        {/* Footer: Guardar (si no está en papelera) + Responder */}
        <div className="border-t border-slate-100">
          {/* Barra guardar / cerrar */}
          <div className="px-4 py-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeWithoutSave}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={closeAfterSaveText}
              disabled={!!note.deleted}
              className="px-4 py-2 rounded-xl bg-pink-500 text-white text-sm hover:bg-pink-600 disabled:opacity-60"
            >
              Guardar
            </button>
          </div>

          {/* Responder */}
          <form onSubmit={handleAddReply} className="px-4 pb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={startVoiceOnce}
              disabled={!speechSupported || forceDisableSpeech || !!note.deleted}
              className={`p-2 rounded-xl border ${
                listening ? "border-rose-300 text-rose-600 bg-rose-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              } disabled:opacity-50`}
              title={
                forceDisableSpeech
                  ? "En iPhone usa el micrófono del teclado para dictar"
                  : (!speechSupported ? "Dictado por voz no soportado en este navegador" : "Dictar por voz")
              }
              aria-label="Dictar por voz"
            >
              <Mic className="w-5 h-5" />
            </button>

            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
              placeholder={forceDisableSpeech ? "En iPhone usa el micrófono del teclado para dictar…" : "Responder…"}
              disabled={!!note.deleted}
            />
            <button
              type="submit"
              disabled={!!note.deleted}
              className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm hover:bg-slate-900 disabled:opacity-60"
            >
              Enviar
            </button>
          </form>

          {forceDisableSpeech && !note.deleted && (
            <div className="px-4 pb-3 text-[11px] text-slate-400">
              💡 En iPhone: usa el micrófono del <strong>teclado</strong> para dictar y el texto entrará aquí.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
