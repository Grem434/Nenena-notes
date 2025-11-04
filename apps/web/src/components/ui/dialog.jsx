import { useEffect } from "react";
import { cn } from "./utils";

export function Dialog({ open, onOpenChange, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onOpenChange?.(false);
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => onOpenChange?.(false)}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl border border-brand-100"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children }) {
  return <div className="p-4 border-b border-brand-100">{children}</div>;
}

export function DialogTitle({ children }) {
  return <h3 className="text-lg font-semibold text-brand-600">{children}</h3>;
}

export function DialogContent({ children, className }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}
