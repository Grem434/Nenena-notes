import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function ShortcutsHelp({ open, onOpenChange }) {
  const close = () => onOpenChange?.(false);
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    // foco inicial en el botón cerrar
    setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[1px] flex items-center justify-center p-4"
      aria-hidden={!open}
      onMouseDown={(e) => {
        // cerrar al clicar fuera del panel
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Ayuda de atajos de teclado"
        className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl p-4 sm:p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-semibold text-slate-800">
            Atajos de teclado — Nenena Notes
          </h2>
          <button
            ref={closeBtnRef}
            onClick={close}
            className="h-8 w-8 inline-grid place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"
            aria-label="Cerrar"
            title="Cerrar (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Section title="General">
            <Kbd>?</Kbd> Abrir esta ayuda
            <Kbd className="ml-3">Esc</Kbd> Cerrar modal / foco / ayuda
          </Section>
          <Section title="Navegación">
            <Kbd>1</Kbd> Todas
            <Kbd className="ml-3">2</Kbd> Pendientes
            <Kbd className="ml-3">3</Kbd> Resueltas
            <Kbd className="ml-3">4</Kbd> Archivo
            <Kbd className="ml-3">5</Kbd> Papelera
          </Section>
          <Section title="Acciones">
            <Kbd>N</Kbd> Nueva nota
            <Kbd className="ml-3">F</Kbd> Buscar
            <div className="text-slate-500 mt-1">
              En tarjetas: <span className="font-medium">Enter</span>/<span className="font-medium">Espacio</span> abre el detalle.
            </div>
          </Section>
          <Section title="Accesibilidad">
            <div className="text-slate-600">
              Todos los iconos tienen <code className="bg-slate-100 px-1 rounded">title</code> y <code className="bg-slate-100 px-1 rounded">aria-label</code>.
            </div>
          </Section>
        </div>

        <div className="mt-4 text-right">
          <button
            onClick={close}
            className="text-sm rounded-xl px-3 py-1.5 border border-slate-200 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-slate-700 mb-1.5">{title}</h3>
      <div className="text-slate-700 leading-7">{children}</div>
    </div>
  );
}

function Kbd({ children, className = "" }) {
  return (
    <kbd
      className={
        "inline-flex items-center justify-center min-w-[24px] h-[24px] px-1.5 text-[12px] font-semibold border rounded-md bg-white shadow-sm border-slate-200 text-slate-800 " +
        className
      }
    >
      {children}
    </kbd>
  );
}
