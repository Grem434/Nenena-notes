import React, { useMemo } from "react";
import { X, Mail, User2 } from "lucide-react";
import { useUsersStore } from "@/store/useUsersStore";
import { useNotesStore } from "@/store/useNotesStore";
import { goAll, goPersonal } from "@/lib/navBus";

function hsvToRgba(c, alpha = 1) {
  if (!c) return `rgba(244,114,182,${alpha})`;
  const h = (((Number(c.h ?? 0) % 360) + 360) % 360);
  const s = Math.max(0, Math.min(100, Number(c.s ?? 0))) / 100;
  const v = Math.max(0, Math.min(100, Number(c.v ?? 0))) / 100;
  const C = v * s;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - C;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [C, X, 0];
  else if (h < 120) [r, g, b] = [X, C, 0];
  else if (h < 180) [r, g, b] = [0, C, X];
  else if (h < 240) [r, g, b] = [0, X, C];
  else if (h < 300) [r, g, b] = [X, 0, C];
  else [r, g, b] = [C, 0, X];
  const to255 = (n) => Math.round((n + m) * 255);
  return `rgba(${to255(r)}, ${to255(g)}, ${to255(b)}, ${alpha})`;
}

export default function UsersSheetMobile({
  open,
  onOpenChange,
  onSelectInbound,
  onSelectPersonal,
}) {
  const users = useUsersStore((s) => s.users || []);
  const notes = useNotesStore((s) => s.notes || []);

  const usersWithCounts = useMemo(() => {
    return users.map((u) => {
      let inbound = 0;
      let personal = 0;
      for (const n of notes) {
        if (!n) continue;
        if (n.archived || n.deleted) continue;
        if (n.to !== u.name) continue;
        if (n.from === u.name) personal++;
        else inbound++;
      }
      return { ...u, inbound, personal };
    });
  }, [users, notes]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"
        onClick={() => onOpenChange?.(false)}
        aria-label="Cerrar"
      />
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-xl max-h-[75vh] flex flex-col dark:bg-slate-950">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Destinatarios</h2>
          <button
            onClick={() => onOpenChange?.(false)}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Botón para limpiar destinatario (volver a generales) */}
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => {
              onSelectInbound?.(null);
              onOpenChange?.(false);
            }}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            Ver todos
          </button>
        </div>

        <div className="overflow-y-auto py-3 px-3 space-y-2">
          {usersWithCounts.length === 0 ? (
            <p className="text-xs text-slate-400 px-1 py-2">
              No hay usuarios todavía.
            </p>
          ) : (
            usersWithCounts.map((user) => {
              const dot = hsvToRgba(user.color, 1);
              const bg1 = hsvToRgba(user.color, 0.18);
              const bg2 = hsvToRgba(user.color, 0.12);
              return (
                <div
                  key={user.name}
                  className="flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl px-3 py-2.5"
                >
                  <span
                    className="w-9 h-9 rounded-full shrink-0"
                    style={{ backgroundColor: dot }}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-200 truncate">
                      {user.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectInbound?.(user.name);
                          onOpenChange?.(false);
                        }}
                        className="inline-flex items-center gap-1 rounded-full text-[10px] px-2 py-0.5"
                        style={{ backgroundColor: bg1 }}
                        title="Notas que le han enviado otros"
                      >
                        <Mail className="w-3 h-3" />
                        {user.inbound}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPersonal?.(user.name);
                          onOpenChange?.(false);
                        }}
                        className="inline-flex items-center gap-1 rounded-full text-[10px] px-2 py-0.5"
                        style={{ backgroundColor: bg2 }}
                        title="Notas personales de este usuario"
                      >
                        <User2 className="w-3 h-3" />
                        {user.personal}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cápsulas de navegación al final del sheet (de otros / personales) */}
        <div className="mt-1 mb-3 px-3">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => { goAll(); onOpenChange?.(false); }}
              className="min-w-[116px] px-3 py-2 rounded-full text-sm font-medium
                         border border-slate-300 bg-white text-slate-700
                         dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
                         active:scale-[0.99] transition"
              aria-label="Ver todas las notas (de otros)"
            >
              de otros
            </button>

            <button
              type="button"
              onClick={() => { goPersonal(); onOpenChange?.(false); }}
              className="min-w-[116px] px-3 py-2 rounded-full text-sm font-medium
                         border border-slate-300 bg-white text-slate-700
                         dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
                         active:scale-[0.99] transition"
              aria-label="Ver notas personales"
            >
              personales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
