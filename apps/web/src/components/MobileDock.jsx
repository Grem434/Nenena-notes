import { useState, useEffect } from "react";
import { useNotesStore } from "@/store/useNotesStore";
import { cn } from "@/lib/utils";
import { List, Clock, CheckCircle2, Box, Trash2 } from "lucide-react";

const SHORTCUT = {
  "todas": "1",
  "pendiente": "2",
  "resuelta": "3",
  "archivadas": "4",
  "papelera": "5",
};

export default function MobileDock() {
  const filter = useNotesStore((s) => s.filter);
  const setFilter = useNotesStore((s) => s.setFilter);

  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > lastY && y - lastY > 8);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const items = [
    { key: "todas", label: "Todas", Icon: List },
    { key: "pendiente", label: "Pend.", Icon: Clock },
    { key: "resuelta", label: "Res.", Icon: CheckCircle2 },
    { key: "archivadas", label: "Archivo", Icon: Box },
    { key: "papelera", label: "Papelera", Icon: Trash2 },
  ];

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-30",
        "bg-white/95 backdrop-blur border-t border-slate-200",
        "transition-transform duration-300",
        hidden ? "translate-y-full" : "translate-y-0"
      )}
      role="tablist"
      aria-label="Buzones"
    >
      <ul className="flex items-stretch justify-between gap-1 px-2 py-1.5">
        {items.map(({ key, label, Icon }) => {
          const active = filter === key;
          const title = `${label} (atajo: ${SHORTCUT[key]})`;
          return (
            <li key={key} className="flex-1">
              <button
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(key)}
                className={cn(
                  "w-full h-12 rounded-xl border text-[11px] font-medium",
                  "flex flex-col items-center justify-center gap-0.5",
                  active
                    ? "bg-pink-50 border-pink-200 text-pink-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
                title={title}
                aria-label={label}
                aria-keyshortcuts={SHORTCUT[key]}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}
