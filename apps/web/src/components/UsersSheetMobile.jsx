import React, { useMemo } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog";
import { useUsersStore } from "@/store/useUsersStore";
import { useNotesStore } from "@/store/useNotesStore";
import { Mail, User2 } from "lucide-react";

function getCounts(notes, username) {
  let inbound = 0;
  let personal = 0;
  for (const n of notes) {
    if (!n) continue;
    if (n.archived || n.deleted) continue;
    if (n.to !== username) continue;
    if (n.from === username) personal++;
    else inbound++;
  }
  return { inbound, personal, total: inbound + personal };
}

export default function UsersSheetMobile({ open, onOpenChange, onSelect }) {
  const users = useUsersStore((s) => s.users || []);
  const notes = useNotesStore((s) => s.notes || []);

  const countsByUser = useMemo(() => {
    const map = {};
    for (const u of users) {
      map[u.name] = getCounts(notes, u.name);
    }
    return map;
  }, [users, notes]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="text-sm text-slate-700 px-4 py-2">
          Destinatarios
        </DialogTitle>
      </DialogHeader>

      <DialogContent className="max-h-[70vh] overflow-y-auto rounded-b-2xl p-4">
        {users.length === 0 ? (
          <p className="text-xs text-slate-400 px-2 py-4">
            No hay usuarios todavía.
          </p>
        ) : (
          <div className="space-y-2">
            {users.map((user) => {
              const counts = countsByUser[user.name] || {
                inbound: 0,
                personal: 0,
                total: 0,
              };
              return (
                <button
                  key={user.name}
                  onClick={() => {
                    onSelect?.(user.name);
                    onOpenChange?.(false);
                  }}
                  className="w-full flex items-center gap-3 bg-slate-50/40 hover:bg-slate-100/80 transition-colors rounded-2xl px-3 py-2.5"
                >
                  <span
                    className="w-8 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: user.color || "#f472b6" }}
                    aria-hidden
                  />
                  <div className="flex-1 text-left">
                    <p className="text-sm text-slate-700 leading-none mb-1">
                      {user.name}
                    </p>
                    <div className="flex items-center gap-1.5">
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
                      {counts.total > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-pink-500/5 text-pink-500 text-[10px] px-2 py-0.5">
                          {counts.total}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
