import { useNotesStore } from "@/store/useNotesStore";
import { useUsersStore } from "@/store/useUsersStore";
import { motion } from "framer-motion";
import { User2 } from "lucide-react";
import { useMemo } from "react";

function hsvToRgbCss({ h, s, v }) {
  if (h == null || s == null || v == null) return "#a3a3a3";
  const S = Math.max(0, Math.min(100, Number(s))) / 100;
  const V = Math.max(0, Math.min(100, Number(v))) / 100;
  const _h = ((Number(h) % 360) + 360) % 360;
  const C = V * S;
  const X = C * (1 - Math.abs(((_h / 60) % 2) - 1));
  const m = V - C;
  let r = 0, g = 0, b = 0;
  if (_h < 60) [r, g, b] = [C, X, 0];
  else if (_h < 120) [r, g, b] = [X, C, 0];
  else if (_h < 180) [r, g, b] = [0, C, X];
  else if (_h < 240) [r, g, b] = [0, X, C];
  else if (_h < 300) [r, g, b] = [X, 0, C];
  else [r, g, b] = [C, 0, X];
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return `rgb(${R}, ${G}, ${B})`;
}

export default function RecipientsSidebar({
  selectedRecipient,
  setSelectedRecipient,
}) {
  const notes = useNotesStore((s) => s.notes);
  const users = useUsersStore((s) => s.users);

  const recipients = useMemo(() => {
    return users.map((u) => {
      const count = notes.filter(
        (n) => n.to === u.name && !n.archived && !n.deleted
      ).length;
      return { ...u, count };
    });
  }, [users, notes]);

  const handleSelect = (name) => {
    if (selectedRecipient === name) {
      setSelectedRecipient(null);
    } else {
      setSelectedRecipient(name);
    }
  };

  return (
    <motion.aside
      className="hidden lg:flex flex-col border-l border-slate-200 bg-white w-64 p-4 overflow-y-auto"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <h2 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
        <User2 size={16} /> Destinatarios
      </h2>

      <div className="space-y-2">
        {recipients.map((user) => (
          <button
            key={user.name}
            onClick={() => handleSelect(user.name)}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-xl border transition-all
              ${
                selectedRecipient === user.name
                  ? "bg-pink-50 border-pink-200 text-pink-700"
                  : "bg-white border-slate-100 hover:bg-slate-50 text-slate-700"
              }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: hsvToRgbCss(user.color) }}
              />
              <span className="text-sm font-medium">{user.name}</span>
            </div>
            <span
              className={`text-xs font-semibold ${
                user.count > 0 ? "text-slate-500" : "text-slate-300"
              }`}
            >
              {user.count}
            </span>
          </button>
        ))}
      </div>
    </motion.aside>
  );
}
