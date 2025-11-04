import { useEffect, useState } from "react";
import { useUsersStore } from "@/store/useUsersStore";
import { X, RefreshCw, Trash2, Plus } from "lucide-react";

/* Helpers HSV → HEX con fallback seguro */
const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n ?? 0)));
const norm = (c) => ({
  h: ((Number(c?.h) || 0) % 360 + 360) % 360,
  s: clamp(c?.s, 0, 100),
  v: clamp(c?.v, 0, 100),
});
const hsvToRgb = ({ h, s, v }) => {
  const S = s / 100, V = v / 100;
  const C = V * S, X = C * (1 - Math.abs(((h / 60) % 2) - 1)), m = V - C;
  let r=0,g=0,b=0;
  if (h < 60) [r,g,b] = [C,X,0];
  else if (h < 120) [r,g,b] = [X,C,0];
  else if (h < 180) [r,g,b] = [0,C,X];
  else if (h < 240) [r,g,b] = [0,X,C];
  else if (h < 300) [r,g,b] = [X,0,C];
  else [r,g,b] = [C,0,X];
  return { r: Math.round((r+m)*255), g: Math.round((g+m)*255), b: Math.round((b+m)*255) };
};
const rgbToHex = ({ r, g, b }) =>
  `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
const safeHex = (c) => {
  try { return rgbToHex(hsvToRgb(norm(c ?? { h: 210, s: 10, v: 83 }))); }
  catch { return "#D1D5DB"; }
};

export default function UsersSheetMobile({ open, onOpenChange, onSelect }) {
  const {
    users,
    ensureDefaults,
    pullUsersIfStale,
    pendingDeleteId,
    askDeleteUser,
    cancelDeleteUser,
    confirmDeleteUser,
    addUser,
  } = useUsersStore();

  const [syncing, setSyncing] = useState(false);

  // Asegura usuarios por defecto una vez
  useEffect(() => { ensureDefaults(); }, [ensureDefaults]);

  // Chequeo de versión y pull al abrir el sheet
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setSyncing(true);
        await pullUsersIfStale?.(true);
      } finally {
        setSyncing(false);
      }
    })();
  }, [open, pullUsersIfStale]);

  const doManualSync = async () => {
    try {
      setSyncing(true);
      await pullUsersIfStale?.(true);
    } finally {
      setSyncing(false);
    }
  };

  const handleAdd = () => {
    const name = prompt("Nombre del nuevo usuario:");
    if (!name) return;
    addUser({ name: name.trim(), color: { h: 200, s: 80, v: 80 } });
  };

  return (
    <div
      className={`fixed inset-0 z-50 md:hidden transition ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => onOpenChange?.(false)}
      />

      {/* Bottom sheet */}
      <div
        className={`absolute left-0 right-0 bottom-0 rounded-t-2xl bg-white shadow-2xl
        border-t border-slate-200 transition-transform ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "78vh" }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between">
          <div className="h-1 w-10 bg-slate-200 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 -top-2.5" />
          <h2 className="text-base font-semibold text-slate-800">Usuarios</h2>
          <button
            className="p-1.5 rounded-md hover:bg-slate-100 active:scale-[0.98]"
            onClick={() => onOpenChange?.(false)}
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Barra “Actualizar colores” */}
        <div className="px-4 pt-3">
          <button
            onClick={doManualSync}
            disabled={syncing}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm
              ${syncing ? "opacity-60 cursor-wait" : "hover:bg-white active:scale-[0.98]"}`}
            aria-label="Actualizar colores"
            title="Actualizar colores"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            Actualizar colores
          </button>
        </div>

        {/* Lista de usuarios */}
        <div className="px-2 pb-3 pt-2 overflow-y-auto" style={{ maxHeight: "calc(78vh - 96px)" }}>
          <ul className="space-y-1">
            {users.map((u) => {
              const colorHex = safeHex(u?.color);
              const isTodos = u.name === "TODOS";
              return (
                <li key={u.name} className="flex items-center justify-between px-2 py-1.5">
                  <button
                    className="flex items-center gap-2 flex-1 text-left rounded-lg px-2 py-2 hover:bg-gray-50 active:scale-[0.99]"
                    onClick={() => { onSelect?.(u.name); onOpenChange?.(false); }}
                  >
                    <span
                      className="inline-block w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: colorHex }}
                      aria-hidden
                    />
                    <span className="text-slate-800">{u.name}</span>
                  </button>

                  {!isTodos && pendingDeleteId !== u.name && (
                    <button
                      onClick={() => askDeleteUser(u.name)}
                      className="p-1 rounded-md hover:bg-rose-50"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                    </button>
                  )}
                  {!isTodos && pendingDeleteId === u.name && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={confirmDeleteUser}
                        className="text-[12px] px-2 py-0.5 rounded-md bg-rose-600 text-white"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={cancelDeleteUser}
                        className="text-[12px] px-2 py-0.5 rounded-md border border-slate-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}

            <li className="pt-1">
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 px-2 py-1.5"
              >
                <Plus className="w-4 h-4" />
                Añadir usuario
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
