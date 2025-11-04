import { useEffect } from "react";
import { useUsersStore } from "@/store/useUsersStore";

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
    const n = norm(c ?? { h: 210, s: 10, v: 83 });
    return rgbToHex(hsvToRgb(n));
  } catch {
    return "#D1D5DB";
  }
};

export default function RecipientsSidebarMobile({ open, onClose, onPickRecipient }) {
  const { users, ensureDefaults, pullRemote } = useUsersStore();

  useEffect(() => { ensureDefaults(); }, [ensureDefaults]);
  useEffect(() => { if (open) pullRemote?.(); }, [open, pullRemote]);

  return (
    <div className={`fixed inset-0 z-40 md:hidden transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div className={`absolute inset-0 bg-black/30 ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <aside
        className={`absolute right-0 top-0 h-full w-[84%] max-w-[360px] bg-white shadow-2xl border-l border-slate-200
        transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-4 space-y-3 overflow-y-auto h-full">
          <h2 className="text-base font-semibold text-gray-700">Destinatarios</h2>
          <ul className="space-y-1">
            {users.map((u) => (
              <li key={u.name}>
                <button
                  className="w-full text-left flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-50"
                  onClick={() => { onPickRecipient?.(u.name); onClose?.(); }}
                >
                  <span
                    className="nenena-dot"
                    style={{ backgroundColor: safeHex(u?.color) }}
                    aria-hidden
                  />
                  <span className="text-gray-800">{u.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
