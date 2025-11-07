import React, { useMemo } from "react";
import { useNotesStore } from "@/store/useNotesStore";
import { useUsersStore } from "@/store/useUsersStore";
import { Mail, User2 } from "lucide-react";

function getCounts(notes, username) {
  let inbound = 0;
  let personal = 0;

  for (const n of notes) {
    if (!n) continue;
    if (n.archived) continue;
    if (n.deleted) continue;
    if (n.to !== username) continue;

    const isPersonal = n.from === username;
    if (isPersonal) {
      personal++;
    } else {
      inbound++;
    }
  }

  return {
    inbound,
    personal,
    total: inbound + personal,
  };
}

export default function RecipientsSidebar({
  selectedRecipient,
  setSelectedRecipient,
}) {
  const notes = useNotesStore((s) => s.notes || []);
  const users = useUsersStore((s) => s.users || []);

  // Precomputamos contadores por nombre para no recalcular en cada render
  const countsByUser = useMemo(() => {
    const map = {};
    for (const u of users) {
      map[u.name] = getCounts(notes, u.name);
    }
    return map;
  }, [notes, users]);

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 border-l border-slate-100 bg-white/60 backdrop-blur-sm">
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Destinatarios
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {users.length === 0 ? (
          <p className="text-xs text-slate-400 px-4 py-2">
            No hay usuarios todavía.
          </p>
        ) : (
          <ul className="space-y-1 px-2">
            {users.map((user) => {
              const counts = countsByUser[user.name] || {
                inbound: 0,
                personal: 0,
                total: 0,
              };
              const isActive = selectedRecipient === user.name;
              return (
                <li key={user.name}>
                  <button
                    onClick={() =>
                      setSelectedRecipient(
                        isActive ? null : user.name // permite deseleccionar
                      )
                    }
                    className={[
                      "w-full flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors",
                      isActive
                        ? "bg-pink-50 border border-pink-100"
                        : "hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {/* puntito de color del user */}
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: user.color || "#f472b6" }}
                      aria-hidden
                    />
                    <span className="flex-1 text-sm text-slate-700 truncate">
                      {user.name}
                    </span>

                    {/* contadores */}
                    <span className="flex items-center gap-1">
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600 px-1.5 py-0.5"
                        title="Notas de otros para este destinatario"
                      >
                        <Mail className="w-3 h-3" />
                        {counts.inbound}
                      </span>
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 text-[10px] text-violet-700 px-1.5 py-0.5"
                        title="Notas personales de este usuario"
                      >
                        <User2 className="w-3 h-3" />
                        {counts.personal}
                      </span>
                    </span>

                    {/* total visible solo si está seleccionado */}
                    {isActive && counts.total > 0 ? (
                      <span className="ml-1 inline-flex items-center rounded-full bg-pink-500/10 text-pink-500 text-[10px] px-2 py-0.5">
                        {counts.total}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="px-4 py-2 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 leading-tight">
          📨 = notas que le han mandado otros · 👤 = notas personales
        </p>
      </div>
    </aside>
  );
}
