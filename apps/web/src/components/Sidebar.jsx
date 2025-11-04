import { useEffect, useRef, useState } from "react";
import { useUsersStore } from "@/store/useUsersStore";
import { useNotesStore } from "@/store/useNotesStore";
import UserColorPicker from "@/components/UserColorPicker";
import { Trash2, Plus, ChevronDown, ChevronRight, LogOut } from "lucide-react";

const UI_KEY = "nenena-ui-personales-open";

/* === Helpers color (HSV → HEX) === */
const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n ?? 0)));
const cleanHSV = (c) => ({
  h: ((Number(c?.h) || 0) % 360 + 360) % 360,
  s: clamp(c?.s, 0, 100),
  v: clamp(c?.v, 0, 100),
});
const hsvToRgb = ({ h, s, v }) => {
  const S = s / 100, V = v / 100;
  const C = V * S, X = C * (1 - Math.abs(((h / 60) % 2) - 1)), m = V - C;
  let r = 0, g = 0, b = 0;
  if (h <  60) [r, g, b] = [C, X, 0];
  else if (h < 120) [r, g, b] = [X, C, 0];
  else if (h < 180) [r, g, b] = [0, C, X];
  else if (h < 240) [r, g, b] = [0, X, C];
  else if (h < 300) [r, g, b] = [X, 0, C];
  else             [r, g, b] = [C, 0, X];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
};
const rgbToHex = ({ r, g, b }) =>
  `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
const hsvToHex = (hsv) => rgbToHex(hsvToRgb(cleanHSV(hsv || { h: 0, s: 0, v: 85 })));

/* Mapear buzones → atajo */
const MAILBOX_SHORTCUT = {
  "todas": "1",
  "pendiente": "2",
  "resuelta": "3",
  "archivadas": "4",
  "papelera": "5",
};

/* === Sidebar === */
export default function Sidebar({
  onLogout,
  selectedPersonal,
  setSelectedPersonal,
  setSelectedRecipient,
}) {
  // Plegado/desplegado de "Personales" (por defecto PLEGADO)
  const [showPersonales, setShowPersonales] = useState(() => {
    try {
      const raw = localStorage.getItem(UI_KEY);
      return raw ? raw === "1" : false;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(UI_KEY, showPersonales ? "1" : "0");
    } catch {}
  }, [showPersonales]);

  const {
    users,
    addUser,
    ensureDefaults,
    pendingDeleteId,
    askDeleteUser,
    cancelDeleteUser,
    confirmDeleteUser,
    updateColor, // ← lo usamos para confirmar color
  } = useUsersStore();

  const filter = useNotesStore((s) => s.filter);
  const setFilter = useNotesStore((s) => s.setFilter);

  useEffect(() => {
    ensureDefaults();
  }, [ensureDefaults]);

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
  };

  const handleAddUser = () => {
    const name = prompt("Nombre del nuevo usuario:");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    addUser({ name: trimmed, color: { h: 200, s: 80, v: 80 } });
  };

  // Confirmación de borrado: cerrar al hacer click fuera / ESC
  const boxRef = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (!pendingDeleteId) return;
      if (boxRef.current && !boxRef.current.contains(e.target)) cancelDeleteUser();
    };
    const onEsc = (e) => {
      if (e.key === "Escape" && pendingDeleteId) cancelDeleteUser();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      window.removeEventListener("keydown", onEsc);
    };
  }, [pendingDeleteId, cancelDeleteUser]);

  /* ====== ColorPicker control ====== */
  const [pickerFor, setPickerFor] = useState(null); // objeto usuario o null
  const [anchorRect, setAnchorRect] = useState(null);

  // También reaccionamos al CustomEvent por si el picker usa fallback
  useEffect(() => {
    const handler = (e) => {
      const { name, color } = e.detail || {};
      if (!name || !color) return;
      updateColor(name, color);
    };
    window.addEventListener("nenena:user-color-confirm", handler);
    return () => window.removeEventListener("nenena:user-color-confirm", handler);
  }, [updateColor]);

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col justify-between overflow-y-auto overflow-x-hidden">
      <div className="p-4 space-y-3" ref={boxRef}>
        {/* Branding */}
        <div className="flex items-center gap-3 -mt-1 select-none">
          <img
            src="/icons/icon192.png"
            alt="Icono Nenena Notes"
            width="32"
            height="32"
            className="rounded-xl border border-slate-200 shadow-sm"
            loading="eager"
            decoding="async"
          />
          <h1 className="text-[20px] leading-6 font-extrabold text-slate-800 tracking-tight">
            Nenena <span className="text-slate-400">–</span>{" "}
            <span className="text-pink-600">notes</span>
          </h1>
        </div>

        <h2 className="text-lg font-semibold text-gray-700 mt-3 mb-2">Buzones</h2>

        <ul className="space-y-1" role="listbox" aria-label="Buzones">
          {mailboxes.map((item) => (
            <li key={item.key}>
              <button
                onClick={() => goMailbox(item.key)}
                className={`w-full text-left cursor-pointer rounded-lg px-3 py-2 transition ${
                  filter === item.key
                    ? "bg-pink-50 text-pink-700 border border-pink-200"
                    : "hover:bg-gray-50 text-gray-700 border border-transparent"
                }`}
                role="option"
                aria-selected={filter === item.key}
                title={`${item.label} (atajo: ${MAILBOX_SHORTCUT[item.key] || "—"})`}
                aria-label={`${item.label}`}
                aria-keyshortcuts={MAILBOX_SHORTCUT[item.key] || undefined}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Personales */}
        <div className="mt-4">
          <button
            onClick={() => setShowPersonales((v) => !v)}
            className="flex items-center justify-between w-full text-gray-700 font-medium px-3 py-2 hover:bg-gray-50 rounded-lg"
            aria-expanded={showPersonales}
            title="Personales (mostrar/ocultar)"
            aria-label="Personales"
          >
            <span>Personales</span>
            {showPersonales ? (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          {showPersonales && (
            <ul className="mt-2 space-y-1 pl-2">
              {users.map((user) => {
                const isTodos = user.name === "TODOS";
                const active =
                  filter === "personales" && selectedPersonal === user.name;

                return (
                  <li
                    key={user.name}
                    className={`flex items-center justify-between p-2 rounded-xl ${
                      active ? "bg-pink-50 border border-pink-200" : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Botón principal: navegar al buzón personales del usuario */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        useNotesStore.getState().setFilter("personales");
                        setSelectedPersonal?.(user.name);
                        setSelectedRecipient?.(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          useNotesStore.getState().setFilter("personales");
                          setSelectedPersonal?.(user.name);
                          setSelectedRecipient?.(null);
                        }
                      }}
                      className="flex items-center gap-2 cursor-pointer flex-1 text-left focus:outline-none focus:ring-2 focus:ring-pink-200 rounded-lg"
                      title={`Ver notas personales de ${user.name} (Enter/Espacio)`}
                      aria-label={`Notas personales de ${user.name}`}
                    >
                      {/* DOT de color (abre el picker) */}
                      <button
                        type="button"
                        aria-label={`Cambiar color de ${user.name}`}
                        className="shrink-0 w-3.5 h-3.5 rounded-full border border-black/10 hover:scale-110 transition"
                        style={{ backgroundColor: hsvToHex(user.color) }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setAnchorRect(rect);
                          setPickerFor(user);
                        }}
                        title={`Cambiar color de ${user.name}`}
                      />
                      <span className="text-gray-700 font-medium">{user.name}</span>
                    </div>

                    {/* Acciones eliminar */}
                    {!isTodos && pendingDeleteId !== user.name && (
                      <button
                        onClick={() => askDeleteUser(user.name)}
                        className="p-1 rounded-md hover:bg-rose-50"
                        title={`Eliminar ${user.name}`}
                        aria-label={`Eliminar ${user.name}`}
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" aria-hidden="true" />
                      </button>
                    )}

                    {!isTodos && pendingDeleteId === user.name && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={confirmDeleteUser}
                          className="text-[12px] px-2 py-0.5 rounded-md bg-rose-600 text-white hover:bg-rose-500"
                          title="Confirmar eliminación"
                          aria-label="Confirmar eliminación"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={cancelDeleteUser}
                          className="text-[12px] px-2 py-0.5 rounded-md border border-slate-300 hover:bg-slate-100"
                          title="Cancelar"
                          aria-label="Cancelar"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}

              <li>
                <button
                  onClick={handleAddUser}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mt-1"
                  title="Añadir usuario"
                  aria-label="Añadir usuario"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" /> <span>Añadir usuario</span>
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut className="w-4 h-4 mr-2" aria-hidden="true" /> Cerrar sesión
        </button>
      </div>

      {/* Picker anclado (solo uno a la vez) */}
      {pickerFor && (
        <UserColorPicker
          user={pickerFor}
          anchorRect={anchorRect}
          onClose={() => setPickerFor(null)}
          onConfirm={(name, color) => {
            updateColor(name, color); // actualiza store + sincroniza
            setPickerFor(null);
          }}
        />
      )}
    </aside>
  );
}
