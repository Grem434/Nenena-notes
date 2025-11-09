import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, LayoutGrid, List, Volume2, VolumeX, Users, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSoundStore } from "@/store/useSoundStore";
import ThemeToggle from "@/components/ThemeToggle";

function usePortalPosition(anchorRef, open) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });

  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    if (!anchor) return;

    const update = () => {
      const r = anchor.getBoundingClientRect();
      const gap = 8;
      const width = 220;

      let top = r.bottom + gap + (window.visualViewport?.offsetTop || 0);
      let left = r.right - width + (window.visualViewport?.offsetLeft || 0);

      const safeTop =
        Number(
          getComputedStyle(document.documentElement)
            .getPropertyValue("--sat")
            .replace("px", "")
        ) || 0;

      const vw = window.visualViewport?.width || window.innerWidth;
      const vh = window.visualViewport?.height || window.innerHeight;
      if (left + width > vw - 8) left = vw - width - 8;
      if (left < 8) left = 8;
      if (top > vh - 8) top = vh - 8;
      if (top < safeTop + 8) top = safeTop + 8;

      setPos({ top, left, width });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update, true);

    return () => {
      try { ro.disconnect(); } catch {}
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update, true);
    };
  }, [anchorRef, open]);

  return pos;
}

export default function Navbar({
  onNew,
  search,
  setSearch,
  isCompactView,
  toggleCompact,
  onOpenUsers,
  onOpenHelp,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = () => {
      try {
        inputRef.current?.focus();
        inputRef.current?.select();
      } catch {}
    };
    window.addEventListener("nenena:focus-search", handler);
    return () => window.removeEventListener("nenena:focus-search", handler);
  }, []);

  // Sonido (store)
  const isMuted = useSoundStore((s) => s.isMuted);
  const volume = useSoundStore((s) => s.volume);
  const setVolume = useSoundStore((s) => s.setVolume);
  const toggleMute = useSoundStore((s) => s.toggleMute);
  const effectiveMuted = isMuted || Number(volume) === 0;

  // WebAudio preview
  const acRef = useRef(null);
  const lastVolRef = useRef(Number(volume || 0));
  const lastPingAt = useRef(0);

  const ensureAudioContext = async () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!acRef.current) acRef.current = new Ctx();
      if (acRef.current.state === "suspended") {
        await acRef.current.resume().catch(() => {});
      }
      return acRef.current;
    } catch { return null; }
  };

  const playPreview = async (v) => {
    if (isMuted || v <= 0) return;
    const ac = await ensureAudioContext();
    if (!ac) return;

    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.17);

    const vol = Math.max(0.02, Math.min(0.8, v));
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  };

  const [openVol, setOpenVol] = useState(false);
  const btnVolRef = useRef(null);
  const panelRef = useRef(null);
  const pos = usePortalPosition(btnVolRef, openVol);

  useEffect(() => {
    if (!openVol) return;
    const onDoc = (e) => {
      const t = e.target;
      if (btnVolRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpenVol(false);
    };
    const onEsc = (e) => e.key === "Escape" && setOpenVol(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [openVol]);

  useEffect(() => {
    const el = document.documentElement;
    const sat =
      Number(getComputedStyle(el).getPropertyValue("padding-top").replace("px", "")) || 0;
    el.style.setProperty("--sat", `env(safe-area-inset-top, ${sat}px)`);
  }, []);

  const handleSubmit = (e) => { e.preventDefault(); inputRef.current?.blur(); };

  const ToggleIcon = isCompactView ? LayoutGrid : List;
  const toggleTitle = isCompactView ? "Cambiar a vista de cuadrícula" : "Cambiar a vista compacta";
  const SoundIcon = effectiveMuted ? VolumeX : Volume2;

  return (
    <header
      className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="max-w-7xl mx-auto w-full px-4 py-2.5 flex items-center gap-2">
        {/* Buscar */}
        <form onSubmit={handleSubmit} className="flex-1">
          <label htmlFor="nenena-search" className="sr-only">Buscar (atajo: F)</label>
          <input
            id="nenena-search"
            ref={inputRef}
            type="search"
            placeholder="Buscar notas… (F)"
            title="Buscar (atajo: F)"
            aria-keyshortcuts="F"
            className={cn(
              "w-full rounded-xl border px-3 py-2 text-sm transition",
              "border-slate-200 bg-white/80 text-slate-700 placeholder:text-slate-400",
              "focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300",
              "dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder:text-slate-400",
              "dark:focus:ring-pink-300 dark:focus:border-pink-400"
            )}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        {/* Botón ayuda (solo desktop) */}
        <button
          onClick={() => onOpenHelp?.()}
          className="hidden md:grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
          title="Atajos de teclado (¿ / ?)"
          aria-label="Abrir ayuda de atajos"
          aria-keyshortcuts="?"
        >
          <HelpCircle size={18} aria-hidden="true" />
        </button>

        {/* Sólo móvil: usuarios */}
        <button
          onClick={() => onOpenUsers?.()}
          className="md:hidden h-9 w-9 grid place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
          title="Usuarios"
          aria-label="Usuarios"
        >
          <Users size={18} aria-hidden="true" />
        </button>

        {/* Toggle vista */}
        <button
          onClick={toggleCompact}
          title={toggleTitle}
          aria-label={toggleTitle}
          className={cn(
            "h-9 w-9 grid place-items-center rounded-lg border transition",
            "border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
            "dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
          )}
        >
          <ToggleIcon size={18} aria-hidden="true" />
        </button>

        {/* Conmutador de tema (solo desktop) */}
        <ThemeToggle />

        {/* Sonido */}
        <button
          ref={btnVolRef}
          onClick={() => setOpenVol((v) => !v)}
          title="Ajustar volumen (Esc cierra)"
          aria-label="Ajustar volumen"
          className={cn(
            "h-9 w-9 grid place-items-center rounded-lg border transition",
            "border-slate-200 bg-white hover:bg-slate-50",
            effectiveMuted ? "text-slate-400" : "text-slate-700",
            "dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
          )}
        >
          <SoundIcon size={18} aria-hidden="true" />
        </button>

        {/* Panel de volumen */}
        {openVol &&
          createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Ajustes de volumen"
              className="fixed z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-3"
              style={{
                top: pos.top, left: pos.left, width: pos.width,
                maxHeight: "calc(100dvh - 16px)", overflow: "auto",
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-slate-600 dark:text-slate-300">Volumen</span>
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">
                  {Math.round(Number(volume || 0) * 100)}%
                </span>
              </div>

              <input
                type="range" min={0} max={100} step={1}
                value={Math.round(Number(volume || 0) * 100)}
                onChange={async (e) => {
                  e.stopPropagation();
                  const next = Math.max(0, Math.min(1, Number(e.target.value) / 100));
                  setVolume(next);
                  // Preview suave durante el arrastre (umbral fino e intervalo mínimo)
                  const prev = lastVolRef.current;
                  const delta = Math.abs(next - prev);
                  lastVolRef.current = next;
                  const now = Date.now();
                  const THR=0.02, MIN=140;
                  if (delta < THR || now - lastPingAt.current < MIN) return;
                  await playPreview(next);
                  lastPingAt.current = now;
                }}
                onPointerUp={async (e) => {
                  e.stopPropagation();
                  const v = Math.max(0, Math.min(1, Number(e.currentTarget.value) / 100));
                  if (!isMuted && v > 0) { await playPreview(v); lastPingAt.current = Date.now(); }
                }}
                onTouchEnd={async (e) => {
                  e.stopPropagation();
                  const v = Math.max(0, Math.min(1, Number(e.currentTarget.value) / 100));
                  if (!isMuted && v > 0) { await playPreview(v); lastPingAt.current = Date.now(); }
                }}
                className="w-full h-2 accent-pink-500"
                aria-label="Volumen"
              />

              <div className="mt-3 text-right">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (Number(volume || 0) > 0) {
                      setVolume(0);
                    } else {
                      toggleMute();
                      if (Number(volume || 0) === 0) {
                        const minV = 0.2;
                        setVolume(minV);
                        await playPreview(minV);
                      }
                    }
                  }}
                  className="text-[12px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
                  title={effectiveMuted ? "Quitar silencio" : "Silenciar"}
                >
                  {effectiveMuted ? "Quitar silencio" : "Silenciar"}
                </button>
              </div>
            </div>,
            document.body
          )}

        {/* Nueva nota (desktop) */}
        <button
          onClick={onNew}
          className={cn(
            "hidden sm:inline-flex items-center gap-2 rounded-xl border px-3 h-9 text-sm font-medium transition",
            "bg-pink-500 text-white border-pink-500 hover:bg-pink-600"
          )}
          title="Nueva nota (atajo: N)"
          aria-label="Nueva nota"
          aria-keyshortcuts="N"
        >
          <Plus size={16} aria-hidden="true" />
          Nueva nota
        </button>

        {/* Nueva nota (móvil) */}
        <button
          onClick={onNew}
          className={cn(
            "sm:hidden h-9 w-9 grid place-items-center rounded-lg border text-sm font-medium transition",
            "bg-pink-500 text-white border-pink-500 hover:bg-pink-600"
          )}
          title="Nueva nota (atajo: N)"
          aria-label="Nueva nota"
          aria-keyshortcuts="N"
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
