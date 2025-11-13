import { useEffect } from "react";
import { useNotesStore } from "@/store/useNotesStore";
import { cn } from "@/lib/utils";
import { List, Clock, CheckCircle2, Box, Trash2 } from "lucide-react";

/**
 * MobileDock — barra inferior (iOS safe area friendly)
 * - Se eleva por encima del gesto de "home" en iPhone usando env(safe-area-inset-bottom)
 * - Añadimos 10px extra para que no se solape con el gesto de subir apps recientes
 */
const SHORTCUT = {
  todas: "1",
  pendiente: "2",
  resuelta: "3",
  archivadas: "4",
  papelera: "5",
};

const TABS = [
  { key: "todas", label: "Todas", Icon: List },
  { key: "pendiente", label: "Pend.", Icon: Clock },
  { key: "resuelta", label: "Res.", Icon: CheckCircle2 },
  { key: "archivadas", label: "Archivo", Icon: Box },
  { key: "papelera", label: "Papelera", Icon: Trash2 },
];

export default function MobileDock() {
  const filter = useNotesStore((s) => s.filter);
  const setFilter = useNotesStore((s) => s.setFilter);

  // Atajos (1..5) sólo en móvil para comodidad
  useEffect(() => {
    const onKey = (e) => {
      if (!e || e.repeat) return;
      const k = e.key?.toLowerCase();
      for (const tab of TABS) {
        if (SHORTCUT[tab.key] === k) {
          e.preventDefault();
          setFilter(tab.key);
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setFilter]);

  return (
    <nav
      className="fixed inset-x-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 rounded-t-2xl shadow-[0_-6px_20px_rgba(0,0,0,0.06)]"
      // Elevar por encima del gesto de iPhone y añadir 10px extra.
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 6px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 3px)",
      }}
    >
      <ul className="mx-auto max-w-[900px] grid grid-cols-5 gap-2 px-3 py-2">
        {TABS.map(({ key, label, Icon }) => {
          const active = filter === key;
          return (
            <li key={key} className="flex">
              <button
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[13px]",
                  "border transition active:scale-[0.99]",
                  active
                    ? "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-200 dark:border-pink-800"
                    : "bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
                )}
                aria-pressed={active}
                aria-label={label}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden xs:inline">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
