import { useEffect, useMemo, useState } from "react";

/**
 * DebugSyncOverlay
 * - Solo aparece en desarrollo (import.meta.env.DEV)
 * - Botón flotante 🧪 para abrir/cerrar
 * - Muestra "Último evento" y "Cola (50)"
 * - Acciones: Copiar (con fallback iOS), Compartir (Web Share), Guardar .txt
 */
export default function DebugSyncOverlay() {
  if (!import.meta.env.DEV) return null;

  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ queue: [], last: null });

  useEffect(() => {
    const t = setInterval(() => {
      try {
        const dbg = window.__NEN_SYNC__ || { queue: [], last: null };
        setData({
          queue: Array.isArray(dbg.queue) ? dbg.queue.slice(-50) : [],
          last: dbg.last || null,
        });
      } catch {
        /* noop */
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const prettyLast = useMemo(() => {
    if (!data.last) return "";
    try {
      return JSON.stringify(data.last, null, 2);
    } catch {
      return String(data.last);
    }
  }, [data.last]);

  const prettyQueue = useMemo(() => {
    try {
      return JSON.stringify(data.queue.slice(-50), null, 2);
    } catch {
      return String(data.queue);
    }
  }, [data.queue]);

  const buildText = () =>
    `LAST:\n${prettyLast}\n\nQUEUE(50):\n${prettyQueue}\n`;

  async function copyWithFallback(text) {
    // 1) Intento moderno
    try {
      await navigator.clipboard.writeText(text);
      alert("Copiado al portapapeles ✅");
      return;
    } catch {
      // continúa al fallback
    }
    // 2) Fallback clásico compatible con iOS: textarea temporal + execCommand
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      // estilos para no desplazar layout
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.left = "-1000px";
      ta.style.opacity = "0";
      ta.setAttribute("readonly", "");
      document.body.appendChild(ta);

      // Selección compatible iOS
      const range = document.createRange();
      range.selectNodeContents(ta);
      const sel = window.getSelection();
      sel.removeAllRanges();
      ta.select();
      sel.addRange(range);

      const ok = document.execCommand("copy");
      document.body.removeChild(ta);

      if (ok) {
        alert("Copiado al portapapeles ✅");
      } else {
        // Último recurso: abre un modal con el texto seleccionable
        prompt(
          "No se pudo copiar automáticamente. Selecciona y copia manualmente:",
          text
        );
      }
    } catch {
      prompt(
        "No se pudo copiar automáticamente. Selecciona y copia manualmente:",
        text
      );
    }
  }

  async function onCopy() {
    await copyWithFallback(buildText());
  }

  async function onShare() {
    const text = buildText();
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Nenena Notes — Logs Sync",
          text,
        });
      } else {
        // Si no hay Web Share, intentamos copiar
        await copyWithFallback(text);
      }
    } catch {
      // cancelado o no soportado
    }
  }

  function onSave() {
    try {
      const text = buildText();
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `nenena-sync-logs-${ts}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("No se pudo guardar el archivo.");
    }
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed left-3 bottom-3 z-[100] px-3 py-2 rounded-full shadow-lg border border-slate-200 bg-white text-slate-700 text-sm"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        🧪 Sync
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed left-3 right-3 bottom-14 z-[100] rounded-2xl border border-slate-300 bg-white shadow-2xl overflow-hidden">
          <div className="px-3 py-2 flex items-center justify-between bg-slate-50 border-b border-slate-200">
            <div className="text-[12px] text-slate-700">
              Debug Sync (solo dev) • <code>window.__NEN_SYNC__</code>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onCopy}
                className="text-[12px] px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-100"
              >
                Copiar
              </button>
              <button
                onClick={onShare}
                className="text-[12px] px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-100"
              >
                Compartir
              </button>
              <button
                onClick={onSave}
                className="text-[12px] px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-100"
              >
                Guardar .txt
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-[12px] px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="p-3 border-r border-slate-200">
              <div className="text-xs font-semibold text-slate-700 mb-1">Último evento</div>
              <pre className="text-[11px] leading-[1.25] text-slate-800 whitespace-pre-wrap break-words max-h-64 overflow-auto bg-slate-50 p-2 rounded select-all">
{prettyLast}
              </pre>
            </div>
            <div className="p-3">
              <div className="text-xs font-semibold text-slate-700 mb-1">Cola (últimos 50)</div>
              <pre className="text-[11px] leading-[1.25] text-slate-800 whitespace-pre-wrap break-words max-h-64 overflow-auto bg-slate-50 p-2 rounded select-all">
{prettyQueue}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
