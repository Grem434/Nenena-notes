import { useNotesStore } from "@/store/useNotesStore";
import { useUsersStore } from "@/store/useUsersStore";
import { motion } from "framer-motion";
import { Mail, User2 } from "lucide-react";
import { useMemo } from "react";

function hsvToRgba(c, alpha = 1) {
  if (!c) return `rgba(164,164,164,${alpha})`;
  const h = (((Number(c.h ?? 0) % 360) + 360) % 360);
  const s = Math.max(0, Math.min(100, Number(c.s ?? c.S ?? 0))) / 100;
  const v = Math.max(0, Math.min(100, Number(c.v ?? c.V ?? 0))) / 100;
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

export default function RecipientsSidebar({
  selectedRecipient,
  setSelectedRecipient,
  onSelectInbound,
  onSelectPersonal,
}) {
  const notes = useNotesStore((s) => s.notes || []);
  const users = useUsersStore((s) => s.users || []);

  const computed = useMemo(() => {
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

  return (
    <motion.aside
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="hidden lg:flex lg:flex-col w-64 border-l border-slate-100 bg-white/60 backdrop-blur-sm"
    >
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Destinatarios
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1 px-2">
          {computed.map((user) => {
            const dot = hsvToRgba(user.color, 1);
            const inboundBg = hsvToRgba(user.color, 0.15);
            const personalBg = hsvToRgba(user.color, 0.08);
            const isActive = selectedRecipient === user.name;
            return (
              <li key={user.name}>
                <div
                  className={[
                    "w-full flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors",
                    isActive
                      ? "bg-pink-50 border border-pink-100"
                      : "hover:bg-slate-50",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRecipient(
                        isActive ? null : user.name
                      )
                    }
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: dot }}
                      aria-hidden
                    />
                    <span className="flex-1 text-sm text-slate-700 truncate">
                      {user.name}
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onSelectInbound
                          ? onSelectInbound(user.name)
                          : setSelectedRecipient(user.name)
                      }
                      className="inline-flex items-center gap-0.5 rounded-full text-[10px] px-1.5 py-0.5 hover:brightness-[.97]"
                      style={{ backgroundColor: inboundBg }}
                      title="Notas que le han enviado otros"
                    >
                      <Mail className="w-3 h-3" />
                      {user.inbound}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectPersonal
                          ? onSelectPersonal(user.name)
                          : setSelectedRecipient(user.name)
                      }
                      className="inline-flex items-center gap-0.5 rounded-full text-[10px] px-1.5 py-0.5 hover:brightness-[.97]"
                      style={{ backgroundColor: personalBg }}
                      title="Notas personales de este usuario"
                    >
                      <User2 className="w-3 h-3" />
                      {user.personal}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="px-4 py-2 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 leading-tight">
          📨 de otros · 👤 personales
        </p>
      </div>
    </motion.aside>
  );
}
