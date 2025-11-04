import { motion } from "framer-motion";
import {
  CheckCircle2,
  Box,
  Undo2,
  Trash2,
  CalendarDays,
  Mail,
  MailOpen,
  MessageSquareText,
} from "lucide-react";
import { useRef, useState, useMemo } from "react";
import { useUIStore } from "@/store/useUIStore";
import { useUsersStore } from "@/store/useUsersStore";
import { useNotesStore } from "@/store/useNotesStore";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ===== Helpers color ===== */
function hsvToRgb({ h, s, v }) {
  if (h == null || s == null || v == null) return { r: 242, g: 113, b: 142 };
  const S = Math.max(0, Math.min(100, Number(s))) / 100;
  const V = Math.max(0, Math.min(100, Number(v))) / 100;
  const _h = ((Number(h) % 360) + 360) % 360;
  const C = V * S;
  const X = C * (1 - Math.abs(((_h / 60) % 2) - 1));
  const m = V - C;
  let r = 0, g = 0, b = 0;
  if (_h < 60) [r, g, b] = [C, X, 0];
  else if (_h < 120) [r, g, b] = [X, C, 0];
  else if (_h < 180) [r, g, b] = [0, C, X];
  else if (_h < 240) [r, g, b] = [0, X, C];
  else if (_h < 300) [r, g, b] = [X, 0, C];
  else [r, g, b] = [C, 0, X];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}
function rgbToHex({ r, g, b }) {
  const toHex = (n) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function hsvToHex(hsv) {
  try { return rgbToHex(hsvToRgb(hsv)); } catch { return "#F2718E"; }
}
function pastelize(hex, alpha = 0.24) {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch { return `rgba(242,113,142,${alpha})`; }
}

/* ===== Helpers fecha/estado ===== */
function formatShortDM(isoOrDateStr) {
  try {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDateStr)
      ? new Date(isoOrDateStr + "T12:00:00")
      : new Date(isoOrDateStr);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  } catch { return ""; }
}
function formatFull(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-ES", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch { return ""; }
}
function dueState(dateStr, { archived, status }) {
  if (!dateStr || archived || status === "resuelta") return "none";
  const endOfDue = new Date(dateStr + "T23:59:59").getTime();
  const now = Date.now();
  if (isNaN(endOfDue)) return "none";
  if (endOfDue < now) return "overdue";
  if (endOfDue - now < 48 * 60 * 60 * 1000) return "soon";
  return "future";
}
function useIsTouchDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(pointer: coarse)")?.matches || "ontouchstart" in window;
}

/* ===== Componente ===== */
export default function NoteCard({ note, variant = "grid", tone = "soft" }) {
  const { id, from, to, text, status, archived, deleted, createdAt, dueAt, readAt, replies } = note;

  const { setFocusedNote } = useUIStore();
  const users = useUsersStore((s) => s.users);
  const { toggleStatus, archiveNote, unarchiveNote, deleteNote, hardRemove, markRead } = useNotesStore();

  const fromUser = users.find((u) => u.name === from);
  const toUser   = users.find((u) => u.name === to);

  const fromHex = fromUser?.color ? hsvToHex(fromUser.color) : "#F9A8D4";
  const toHex   = toUser?.color   ? hsvToHex(toUser.color)   : "#A5F3FC";

  const RESOLVED_BG = "#f1fbf6";
  const bgGrid = archived ? "#fbfbfc" : status === "resuelta" ? RESOLVED_BG : pastelize(toHex, tone === "pro" ? 0.18 : 0.26);
  const bgList = status === "resuelta" ? RESOLVED_BG : pastelize(toHex, 0.12);

  const dState = dueState(dueAt, { archived, status });
  const hasReplies = Array.isArray(replies) && replies.length > 0;
  const lastReplyAuthor = hasReplies ? replies[replies.length - 1].author : null;
  const isRead = Boolean(readAt);

  const openFocus = () => { markRead(id); setFocusedNote(id); };
  const handleFocus = (e) => {
    const tag = e?.target?.tagName?.toLowerCase?.() || "";
    if (["button", "svg", "path"].includes(tag)) return;
    openFocus();
  };
  const handleKeyOpen = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFocus(); } };

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch { return false; }
  }, []);
  function vibrateOnce(ms = 10) { try { navigator.vibrate?.(ms); } catch {} }

  /* =======================
     GESTOS (sólo lista)
     ======================= */
  const dragX = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const startT = useRef(0);
  const moved  = useRef(false);
  const dragging = useRef(false);

  const [offset, setOffset] = useState(0);
  const [dragSide, setDragSide] = useState(null);
  const [firedHaptic, setFiredHaptic] = useState(false);

  const THRESHOLD = 100;
  const MAX_SWAY  = 280;
  const TAP_MAX_TIME = 220;
  const TAP_MAX_MOVE = 8;

  function onPointerDown(e) {
    if (variant !== "list") return;
    dragging.current = true;
    const t = e.touches?.[0];
    const x = (t ? t.clientX : e.clientX) ?? 0;
    const y = (t ? t.clientY : e.clientY) ?? 0;
    startX.current = x; startY.current = y; startT.current = Date.now();
    dragX.current = 0; moved.current = false; setFiredHaptic(false);
  }
  function onPointerMove(e) {
    if (!dragging.current || variant !== "list") return;
    const t = e.touches?.[0];
    const x = (t ? t.clientX : e.clientX) ?? 0;
    const y = (t ? t.clientY : e.clientY) ?? 0;

    const dx = x - startX.current;
    const dy = y - startY.current;

    if (Math.abs(dx) > TAP_MAX_MOVE || Math.abs(dy) > TAP_MAX_MOVE) moved.current = true;

    dragX.current = dx;
    const lim = Math.max(-MAX_SWAY, Math.min(MAX_SWAY, dx));
    setOffset(lim);
    setDragSide(lim > 0 ? "right" : lim < 0 ? "left" : null);

    const abs = Math.abs(lim);
    if (!firedHaptic && abs >= THRESHOLD) { vibrateOnce(10); setFiredHaptic(true); }
    if (firedHaptic && abs < THRESHOLD - 8) setFiredHaptic(false);
  }
  function onPointerUp() {
    if (!dragging.current || variant !== "list") return;
    dragging.current = false;

    const dx = dragX.current;
    const abs = Math.abs(dx);

    if (abs >= THRESHOLD) {
      if (dx > 0) {
        const next = status === "pendiente" ? "resuelta" : "pendiente";
        toggleStatus(id);
        notify({
          variant: next === "resuelta" ? "success" : "info",
          title: next === "resuelta" ? "Marcada como resuelta" : "Marcada como pendiente",
        });
      } else {
        if (archived) { unarchiveNote(id); notify({ variant: "info", title: "Nota desarchivada" }); }
        else { archiveNote(id); notify({ variant: "info", title: "Nota archivada" }); }
      }
      setOffset(0); setDragSide(null); setFiredHaptic(false);
      return;
    }

    const dt = Date.now() - startT.current;
    const tapOk = !moved.current && dt <= TAP_MAX_TIME;

    setOffset(0); setDragSide(null); setFiredHaptic(false);
    if (tapOk) openFocus();
  }

  /* ---------- VISTA LISTA (compacta) ---------- */
  if (variant === "list") {
    const progress = Math.min(1, Math.abs(offset) / THRESHOLD);
    const isTouch = useIsTouchDevice();
    const WrapTT = ({ label, children }) =>
      isTouch ? children : (
        <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger>
          <TooltipContent sideOffset={6} className="text-[12px] px-2 py-1">{label}</TooltipContent>
        </Tooltip>
      );

    return (
      <TooltipProvider delayDuration={isTouch ? 0 : 150} disableHoverableContent={isTouch}>
        <div
          className="relative select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        >
          {status === "resuelta" && (
            <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center" aria-hidden="true">
              <CheckCircle2 className="w-10 h-10 sm:w-11 sm:h-11 opacity-15" style={{ color: "#059669" }} />
            </div>
          )}

          <div className="absolute inset-0 rounded-xl overflow-hidden" aria-hidden="true">
            <div className="absolute inset-y-0 left-0 w-full pr-16 grid place-items-center justify-start">
              <div
                className="flex items-center gap-2 rounded-md px-3 py-1"
                style={{
                  marginLeft: 16,
                  background: progress && dragSide === "right" ? "rgba(16,185,129,0.08)" : "transparent",
                  color: "#047857",
                  opacity: dragSide === "right" ? progress : 0,
                  transition: "opacity .15s",
                }}
                title={status === "pendiente" ? "Marcar resuelta" : "Marcar pendiente"}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[13px] font-medium">{status === "pendiente" ? "Resuelta" : "Pendiente"}</span>
              </div>
            </div>

            <div className="absolute inset-y-0 right-0 w-full pl-16 grid place-items-center justify-end">
              <div
                className="flex items-center gap-2 rounded-md px-3 py-1"
                style={{
                  marginRight: 16,
                  background: progress && dragSide === "left" ? "rgba(2,132,199,0.08)" : "transparent",
                  color: "#0369a1",
                  opacity: dragSide === "left" ? progress : 0,
                  transition: "opacity .15s",
                }}
                title={archived ? "Desarchivar" : "Archivar"}
              >
                <Box className="w-4 h-4" />
                <span className="text-[13px] font-medium">{archived ? "Desarchivar" : "Archivar"}</span>
              </div>
            </div>
          </div>

          <motion.div
            role="button"
            tabIndex={0}
            aria-label={`Nota de ${from || "—"} para ${to || "—"}. ${text || "Sin texto"}`}
            onKeyDown={handleKeyOpen}
            layout
            style={{ x: offset }}
            transition={prefersReducedMotion ? undefined : { type: "spring", stiffness: 300, damping: 28 }}
            whileHover={prefersReducedMotion ? undefined : { y: -1, scale: 1.002 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.995 }}
            className={cn(
              "h-[50px] min-h-[50px] sm:h-[56px] sm:min-h-[56px]",
              "rounded-xl border border-slate-200/80",
              "relative overflow-hidden bg-white"
            )}
            onClick={(e) => {
              if (Math.abs(offset) > 2) return;
              handleFocus(e);
            }}
            title="Abrir detalle (Enter/Espacio)"
          >
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ backgroundColor: bgList, opacity: 1 }}
              aria-hidden="true"
            />
            <span className="absolute left-0 top-0 h-full w-[4px] rounded-l-xl" style={{ backgroundColor: fromHex }} />
            <span className="absolute right-0 top-0 h-full w-[3px]" style={{ backgroundColor: toHex }} />

            <div className="relative z-[1] h-full grid grid-cols-[auto,1fr,auto] items-center gap-2 sm:gap-3 px-2.5 sm:px-3">
              <div className="flex items-center gap-1.5 sm:gap-2 max-w-[42%] sm:max-w-[260px]">
                <span
                  className="text-[10.5px] sm:text-[12px] font-semibold px-1 py-0.5 sm:px-1.5 rounded-full border bg-white/90 backdrop-blur truncate"
                  style={{ color: pastelize(fromHex, 1), borderColor: pastelize(fromHex, 0.55) }}
                  title={`De: ${from || "—"}`}
                >
                  {from || "—"}
                </span>
                <span className="text-[10.5px] sm:text-[12px] text-slate-500">→</span>
                <span
                  className="text-[10.5px] sm:text-[12px] font-semibold px-1 py-0.5 sm:px-1.5 rounded-full border bg-white/90 backdrop-blur truncate"
                  style={{ color: pastelize(toHex, 1), borderColor: pastelize(toHex, 0.55) }}
                  title={`Para: ${to || "—"}`}
                >
                  {to || "—"}
                </span>
              </div>

              <p className="text-[12.5px] sm:text-[13px] text-slate-800 min-w-0 truncate" title={text || "Sin texto…"}>
                {text || <span className="text-slate-500 italic">Sin texto…</span>}
              </p>

              <div className="flex items-center gap-1.25 sm:gap-2 pl-1.5 sm:pl-2 shrink-0">
                {dueAt && !archived && (
                  <span
                    className={cn(
                      "hidden sm:inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] border",
                      dueState(dueAt, { archived, status }) === "overdue" && "bg-rose-50 text-rose-700 border-rose-200",
                      dueState(dueAt, { archived, status }) === "soon" && "bg-amber-50 text-amber-700 border-amber-200",
                      dueState(dueAt, { archived, status }) === "future" && "bg-white/85 text-slate-700 border-slate-200"
                    )}
                    title={`Vence: ${formatShortDM(dueAt)}`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    {formatShortDM(dueAt)}
                  </span>
                )}

                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[10.5px] sm:text-[11px] border",
                    isRead ? "bg-white/80 text-slate-700 border-slate-200" : "bg-sky-50 text-sky-800 border-sky-200"
                  )}
                  title={isRead ? `Leída: ${formatFull(readAt)}` : "No leída"}
                >
                  {isRead ? <MailOpen className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                  {isRead ? `Leída · ${formatShortDM(readAt)}` : "No leída"}
                </span>

                {hasReplies && (
                  <span
                    className="hidden xs:inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] border bg-violet-50 text-violet-800 border-violet-200"
                    title={`Respuestas: ${replies.length}`}
                  >
                    <MessageSquareText className="w-3.5 h-3.5" />
                    {replies.length}
                  </span>
                )}

                <span className="hidden sm:block text-[11px] text-slate-600 w-[48px] text-right">
                  {formatShortDM(createdAt)}
                </span>

                {deleted && (
                  <TooltipProvider delayDuration={useIsTouchDevice() ? 0 : 150} disableHoverableContent={useIsTouchDevice()}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            hardRemove(id);
                            notify({ variant: "destructive", title: "Eliminada definitivamente" });
                          }}
                          className="ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 transition"
                          title="Eliminar definitivamente"
                          aria-label="Eliminar definitivamente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6} className="text-[12px] px-2 py-1">
                        Eliminar definitivamente
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </TooltipProvider>
    );
  }

  /* ---------- VISTA GRID (CUADRADA + LISTAS multi-línea) ---------- */
  const isTouch = useIsTouchDevice();
  const WrapTT = ({ label, children }) =>
    isTouch ? children : (
      <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent sideOffset={6} className="text-[12px] px-2 py-1">{label}</TooltipContent>
      </Tooltip>
    );

  const lines = String(text || "").split(/\r?\n/).filter((l) => l.trim() !== "");
  const isMultiLine = lines.length > 1;
  const MAX_ITEMS = 5; // para no chocar con el pie

  return (
    <TooltipProvider delayDuration={isTouch ? 0 : 150} disableHoverableContent={isTouch}>
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={`Nota de ${from || "—"} para ${to || "—"}. ${text || "Sin texto"}`}
        onKeyDown={handleKeyOpen}
        onClick={handleFocus}
        whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.003 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
        transition={prefersReducedMotion ? undefined : { type: "spring", stiffness: 160, damping: 18 }}
        className={cn(
          "h-auto w-full",
          "rounded-xl border overflow-hidden relative flex flex-col justify-between select-none transition-all",
          "border-slate-200"
        )}
        style={{
          aspectRatio: "4 / 3",
          backgroundColor: bgGrid,
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          backgroundImage:
            "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMCwwLDAsMC4wMSkiLz48L3N2Zz4=')",
          backgroundRepeat: "repeat",
          backgroundSize: "20px 20px",
        }}
        title="Abrir detalle (Enter/Espacio)"
      >
        {status === "resuelta" && (
          <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center" aria-hidden="true">
            <CheckCircle2 className="w-24 h-24 sm:w-28 sm:h-28 opacity-15" style={{ color: "#059669" }} />
          </div>
        )}

        {/* Cabecera sin saltos */}
        <div className="px-3 pt-3 pb-2 flex items-center justify-between relative z-10">
          <div className="text-[12px] sm:text-[13px] flex items-center gap-1 whitespace-nowrap overflow-hidden min-w-0">
            <span className="text-slate-600 shrink-0">De:</span>
            <span
              className="font-semibold px-1.5 py-0.5 rounded-full border bg-white text-slate-800 truncate max-w-[40%]"
              style={{ borderColor: pastelize(fromHex, 0.55), boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}
              title={`De: ${from || "—"}`}
            >
              {from || "—"}
            </span>
            <span className="text-slate-600 shrink-0">→</span>
            <span
              className="font-semibold px-1.5 py-0.5 rounded-full border bg-white text-slate-800 truncate max-w-[40%]"
              style={{ borderColor: pastelize(toHex, 0.55), boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}
              title={`Para: ${to || "—"}`}
            >
              {to || "—"}
            </span>
          </div>
        </div>

        {/* Contenido: lista multi-línea o párrafo */}
        <div className="px-3 pb-2 flex-1 overflow-hidden relative z-10">
          {isMultiLine ? (
            <ul className="text-[13px] sm:text-[14px] leading-snug space-y-1 pr-1">
              {lines.slice(0, MAX_ITEMS).map((l, i) => (
                <li key={i} className="list-none flex items-start gap-1">
                  <span className="mt-[6px] inline-block h-[4px] w-[4px] rounded-full bg-slate-400/70 shrink-0" />
                  <span className="truncate text-slate-700">{l}</span>
                </li>
              ))}
              {lines.length > MAX_ITEMS && (
                <li className="list-none flex items-start gap-1">
                  <span className="mt-[6px] inline-block h-[4px] w-[4px] rounded-full bg-slate-400/70 shrink-0" />
                  <span className="truncate text-slate-500">…</span>
                </li>
              )}
            </ul>
          ) : (
            <p
              className={cn(
                status === "resuelta" ? "text-slate-500" : "text-slate-700",
                "text-[13px] sm:text-[14px] leading-snug line-clamp-6 mb-1"
              )}
              title={text || "Sin texto…"}
            >
              {text || <em className="text-slate-400">Sin texto…</em>}
            </p>
          )}
        </div>

        {/* Pie */}
        <div className="px-3 py-2 border-t border-slate-300/40 bg-white/40 backdrop-blur-[1px] text-[11px] text-slate-650 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">{formatShortDM(createdAt)}</span>

            {!deleted ? (
              <div className="flex gap-2 items-center">
                <WrapTT label={status === "pendiente" ? "Marcar resuelta" : "Marcar pendiente"}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = status === "pendiente" ? "resuelta" : "pendiente";
                      toggleStatus(id);
                      notify({
                        variant: next === "resuelta" ? "success" : "info",
                        title: next === "resuelta" ? "Marcada como resuelta" : "Marcada como pendiente",
                      });
                    }}
                    className="hover:text-emerald-600 transition-colors"
                    title={status === "pendiente" ? "Marcar resuelta" : "Marcar pendiente"}
                    aria-label={status === "pendiente" ? "Marcar resuelta" : "Marcar pendiente"}
                  >
                    {status === "pendiente" ? <CheckCircle2 size={14} /> : <Undo2 size={14} />}
                  </button>
                </WrapTT>

                <WrapTT label={archived ? "Desarchivar" : "Archivar"}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (archived) { unarchiveNote(id); notify({ variant: "info", title: "Nota desarchivada" }); }
                      else { archiveNote(id); notify({ variant: "info", title: "Nota archivada" }); }
                    }}
                    className="hover:text-sky-600 transition-colors"
                    title={archived ? "Desarchivar" : "Archivar"}
                    aria-label={archived ? "Desarchivar" : "Archivar"}
                  >
                    <Box size={14} />
                  </button>
                </WrapTT>

                <WrapTT label="Eliminar">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(id);
                      notify({ variant: "destructive", title: "Nota enviada a la papelera" });
                    }}
                    className="hover:text-rose-600 transition-colors"
                    title="Eliminar"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </WrapTT>
              </div>
            ) : (
              <WrapTT label="Eliminar definitivamente">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    hardRemove(id);
                    notify({ variant: "destructive", title: "Eliminada definitivamente" });
                  }}
                  className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 transition"
                  title="Eliminar definitivamente"
                  aria-label="Eliminar definitivamente"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">Eliminar definitivamente</span>
                </button>
              </WrapTT>
            )}
          </div>

          {dueAt && !archived && (
            <div className="mt-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border",
                  dState === "overdue" && "bg-rose-50 text-rose-700 border-rose-200",
                  dState === "soon" && "bg-amber-50 text-amber-700 border-amber-200",
                  dState === "future" && "bg-white/85 text-slate-700 border-slate-200",
                  dState === "none" && "bg-white/70 text-slate-600 border-slate-200/70"
                )}
                title="Fecha de vencimiento"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="font-medium">{formatShortDM(dueAt)}</span>
              </span>
            </div>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border",
                isRead ? "bg-white/80 text-slate-700 border-slate-200" : "bg-sky-50 text-sky-800 border-sky-200"
              )}
              title={isRead ? `Leída: ${formatFull(readAt)}` : "No leída"}
            >
              {isRead ? <MailOpen className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
              {isRead ? `Leída · ${formatShortDM(readAt)}` : "No leída"}
            </span>

            {hasReplies && (
              <span
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border bg-violet-50 text-violet-800 border-violet-200"
                title={`Respuestas: ${replies.length}`}
              >
                <MessageSquareText className="w-3.5 h-3.5" />
                {replies.length} respuesta{replies.length > 1 ? "s" : ""} · Últ.: {lastReplyAuthor}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
