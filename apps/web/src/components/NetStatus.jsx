import { useEffect, useRef, useState } from "react";
import { RefreshCcw, CheckCircle2, WifiOff } from "lucide-react";

/**
 * NetStatus
 * Pill bottom-right with:
 *  - Online/offline state
 *  - Manual "Reintentar" to pull remote data
 *  - Auto re-pull on reconnect
 *  - Shows last sync time (short)
 *
 * Props:
 * - onPull: async () => Promise<void>  // ejecuta el re-pull externo (ej. pullAllNotes + applyRemoteNotes)
 */
export default function NetStatus({ onPull }) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(() => {
    try { return localStorage.getItem("nenena:lastSync") || ""; } catch { return ""; }
  });

  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      mounted.current = false;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Auto re-pull cuando vuelve la conexión
  useEffect(() => {
    if (!isOnline) return;
    // pequeño debounce por si la red "flapea"
    const t = setTimeout(async () => {
      await doPull();
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  async function doPull() {
    if (!onPull || syncing) return;
    try {
      setSyncing(true);
      await onPull();
      const when = new Date().toISOString();
      try {
        localStorage.setItem("nenena:lastSync", when);
      } catch {}
      setLastSync(when);
    } catch (e) {
      // silencioso: se puede estar sin red aunque navigator.onLine sea true
      // no bloqueamos nada
    } finally {
      if (mounted.current) setSyncing(false);
    }
  }

  const niceTime = lastSync
    ? new Date(lastSync).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      aria-live="polite"
      className="fixed right-3 bottom-3 md:bottom-4 md:right-4 z-[90] select-none"
    >
      <div
        className={
          [
            "flex items-center gap-2 rounded-full shadow-lg border px-3 py-1.5",
            "backdrop-blur-md",
            isOnline ? "bg-white/90 border-emerald-200" : "bg-rose-50/95 border-rose-200",
          ].join(" ")
        }
        role="status"
        aria-label={isOnline ? "Conectado" : "Sin conexión"}
      >
        {isOnline ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
        ) : (
          <WifiOff className="w-4 h-4 text-rose-600" aria-hidden="true" />
        )}

        <div className="text-sm">
          {isOnline ? "Conectado" : "Sin conexión — trabajando en local"}
          {isOnline && niceTime && !syncing && (
            <span className="ml-2 text-xs text-slate-500">Últ. sync {niceTime}</span>
          )}
          {syncing && <span className="ml-2 text-xs text-slate-500">Sincronizando…</span>}
        </div>

        <button
          type="button"
          onClick={doPull}
          className="ml-1 inline-flex items-center justify-center w-8 h-8 rounded-full border bg-white hover:bg-slate-50 active:scale-[.98] transition"
          title="Reintentar sincronización"
          aria-label="Reintentar sincronización"
        >
          <RefreshCcw className={"w-4 h-4 " + (syncing ? "animate-spin" : "")} />
        </button>
      </div>
    </div>
  );
}
