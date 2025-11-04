import { useEffect, useMemo, useRef, useState } from "react";
import { useUsersStore } from "@/store/useUsersStore";
import { useNotesStore } from "@/store/useNotesStore";
import { Trash2, Plus, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

/* HSV → HEX (con fallback) */
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
  try {
    const n = norm(c ?? { h: 210, s: 10, v: 83 }); // gris claro fallback
    return rgbToHex(hsvToRgb(n));
  } catch {
    return "#D1D5DB";
  }
};

export default function SidebarMobile({
  open,
  onClose,
  selectedPersonal,
  setSelectedPersonal,
  setSelectedRecipient,
}) {
  const {
    users,
    ensureDefaults,
    pullRemote,
    pendingDeleteId,
    askDeleteUser,
    cancelDeleteUser,
    confirmDeleteUser,
    addUser,
  } = useUsersStore();

  const filter = useNotesStore((s) => s.filter);
  const setFilter = useNotesStore((s) => s.setFilter);

  const [openUsers, setOpenUsers] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => { ensureDefaults(); }, [ensureDefaults]);

  const doPull = async (reason = "manual") => {
    try {
      setSyncing(true);
      await pullRemote?.();
      setLastSyncedAt(Date.now());
    } catch (e) {
      console.warn("[users] pull error", e);
    } finally {
      setSyncing(false);
    }
  };

  // Pull al abrir + polling mientras está abierto
  useEffect(() => {
    if (!open) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    doPull("open");
    pollRef.current = setInterval(() => doPull("poll"), 10000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [open]);

  // Re-pull al recuperar foco
  useEffect(() => {
    const onFocus = () => open && doPull("focus");
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [open]);

  const lastSyncedText = useMemo(() => {
    if (!lastSyncedAt) return "—";
    const d = new Date(lastSyncedAt);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }, [lastSyncedAt]);

  const mailboxes = [
    { label: "Todas", key: "todas" },
    { label: "Pendientes", key: "pendiente" },
    { label: "Resueltas", key: "resuelta" },
    { label: "Archivo", key: "archivadas" },
    { label: "Papelera", key: "papelera" },
  ];

  const goMailbox = (key) => {
    setFilter(key);
    setSelectedPersonal?.(null);
    setSelectedRecipient?.(null);
    onClose?.();
  };

  const onTapUser = (name) => {
    setFilter("personales");
    setSelectedPersonal?.(name);
    setSelectedRecipient?.(null);
    onClose?.();
  };

  const onAddUser = () => {
    const name = prompt("Nombre del nuevo usuario:");
    if (!name) return;
    addUser({ name: name.trim(), color: { h: 200, s: 80, v: 80 } });
  };

  return (
    <div
      className={`fixed inset-0 z-40 md:hidden transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute left-0 top-0 h-full w-[84%] max-w-[360px] bg-white shadow-2xl border-r border-slate-200
        transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-4 space-y-3 overflow-y-auto h-full">
          <div className="flex items-center gap-3 select-none">
            <img src="/icons/icon128.png" alt="" width="28" height="28" className="rounded-lg border border-slate-200" />
            <h1 className="text-[18px] font-extrabold text-slate-800">
              Nenena <span className="text-slate-400">–</span>{" "}
              <span className="text-pink-600">notes</span>
            </h1>
          </div>

          <h2 className="text-base font-semibold text-gray-700 mt-2">Buzones</h2>
          <ul className="space-y-1">
            {mailboxes.map((m) => (
              <li key={m.key}>
                <button
                  onClick={() => goMailbox(m.key)}
                  className={`w-full text-left rounded-lg px-3 py-2 ${
                    filter === m.key ? "bg-pink-50 text-pink-700 border border-pink-200" : "hover:bg-gray-50"
                  }`}
                >
                  {m.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Personales */}
          <div className="mt-3">
            <button
              onClick={() => setOpenUsers((v) => !v)}
              className="flex items-center justify-between w-full text-gray-700 font-medium px-3 py-2 hover:bg-gray-50 rounded-lg"
            >
              <span>Personales</span>
              {openUsers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {openUsers && (
              <>
                {/* Barra de sincronización */}
                <div className="flex items-center justify-between px-2 py-1.5 mt-1 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[12px] text-slate-600">
                    Colores:{" "}
                    <span className="font-medium">
                      {syncing ? "Sincronizando…" : `Actualizado ${lastSyncedText}`}
                    </span>
                  </div>
                  <button
                    onClick={() => doPull("button")}
                    disabled={syncing}
                    className={`inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-md border ${
                      syncing ? "opacity-60 cursor-wait" : "hover:bg-white active:scale-[0.98]"
                    }`}
                    aria-label="Actualizar colores"
                    title="Actualizar colores"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                    Actualizar
                  </button>
                </div>

                <ul className="mt-2">
                  {users.map((u) => {
                    const isTodos = u.name === "TODOS";
                    const active = filter === "personales" && selectedPersonal === u.name;
                    const colorHex = safeHex(u?.color);
                    return (
                      <li key={u.name} className="flex items-center justify-between px-2 py-2 rounded-lg">
                        <button
                          className={`flex items-center gap-2 flex-1 text-left rounded-lg px-2 py-1.5 ${
                            active ? "bg-pink-50 border border-pink-200" : "hover:bg-gray-50"
                          }`}
                          onClick={() => onTapUser(u.name)}
                        >
                          {/* DOT visible siempre */}
                          <span
                            className="nenena-dot"
                            style={{ backgroundColor: colorHex }}
                            aria-hidden
                          />
                          <span className="text-gray-800">{u.name}</span>
                        </button>

                        {/* Eliminar */}
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

                  <li className="mt-1">
                    <button onClick={onAddUser} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
                      <Plus className="w-4 h-4" /> <span>Añadir usuario</span>
                    </button>
                  </li>
                </ul>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
