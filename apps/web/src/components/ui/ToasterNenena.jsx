import React, { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Info, CheckCircle2, AlertTriangle, Octagon } from "lucide-react";
import { useSound } from "@/providers/SoundProvider";
import { onNotify } from "@/lib/notify"; // 🔗 conexión real con notify()

// 🎨 Estilos Nenena pastel
const variantsStyle = {
  info: "bg-blue-50 text-slate-800 border-blue-200",
  success: "bg-emerald-50 text-slate-800 border-emerald-200",
  warning: "bg-amber-50 text-slate-900 border-amber-200",
  destructive: "bg-rose-50 text-slate-900 border-rose-200",
};

const variantsIcon = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: Octagon,
};

export default function ToasterNenena() {
  const [items, setItems] = useState([]);
  const reduced = useReducedMotion();
  const { playSound } = useSound();

  // 🔔 Escucha eventos desde notify()
  useEffect(() => {
    const handleNotify = (evt) => {
      const id = Date.now();
      const toast = {
        id,
        title: evt?.title || "Notificación",
        description: evt?.description || "",
        variant: evt?.variant || "info",
        duration: evt?.duration || 3000,
      };

      setItems((cur) => [...cur, toast]);
      playSound?.();

      if (Number.isFinite(toast.duration) && toast.duration > 0) {
        setTimeout(() => {
          setItems((cur) => cur.filter((x) => x.id !== toast.id));
        }, toast.duration + 100);
      }
    };

    // Suscripción a notify
    onNotify(handleNotify);
    return () => onNotify(null);
  }, [playSound]);

  const dismiss = useCallback((id) => {
    setItems((cur) => cur.filter((x) => x.id !== id));
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-0 z-[999] flex flex-col items-end gap-2 p-4 sm:p-6"
    >
      <ul className="ml-auto flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map((toast) => {
            const Icon = variantsIcon[toast.variant] ?? Info;
            const style = variantsStyle[toast.variant] ?? variantsStyle.info;

            const motionProps = reduced
              ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
              : {
                  initial: { opacity: 0, scale: 0.96, y: 8 },
                  animate: {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    transition: { type: "spring", stiffness: 420, damping: 28, mass: 0.8 },
                  },
                  exit: {
                    opacity: 0,
                    scale: 0.96,
                    y: 8,
                    transition: { duration: 0.18 },
                  },
                };

            return (
              <motion.li
                key={toast.id}
                {...motionProps}
                className={`pointer-events-auto relative overflow-hidden rounded-2xl border shadow-sm ${style}`}
                role={toast.variant === "destructive" ? "alert" : "status"}
              >
                <div className="flex items-start gap-3 p-3.5">
                  <Icon className="h-5 w-5 opacity-80 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    {toast.title ? (
                      <p className="text-sm font-semibold leading-5">{toast.title}</p>
                    ) : null}
                    {toast.description ? (
                      <p className="mt-0.5 text-sm leading-5 text-slate-700 line-clamp-3">
                        {toast.description}
                      </p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => dismiss(toast.id)}
                    className="rounded-full p-1.5 text-slate-700/80 hover:bg-white/70 hover:text-slate-900 transition"
                    aria-label="Cerrar notificación"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {Number.isFinite(toast.duration) && toast.duration > 0 ? (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5">
                    <div
                      className="h-full bg-slate-900/20"
                      style={{
                        animation: `nenena-toast-life ${toast.duration}ms linear forwards`,
                      }}
                    />
                  </div>
                ) : null}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <style>{`
        @keyframes nenena-toast-life {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
