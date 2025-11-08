import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import { syncUpsertNote, syncDeleteNote, syncHardDeleteNote } from "@/lib/sync";

const NOTES_STORAGE_KEY = "nenena-notes-v1";

const baseState = {
  notes: [],
  lastSyncAt: null,
};

export const useNotesStore = create(
  persist(
    (set, get) => ({
      ...baseState,

      setNotes: (notes) => set({ notes }),

      addNote: (data) => {
        const note = {
          id: uuid(),
          from: data.from ?? "",
          to: data.to ?? "",
          text: data.text ?? "",
          archived: data.archived ?? false,
          deleted: false,
          resolved: data.resolved ?? false,
          readAt: null,
          dueAt: data.dueAt ?? null,
          replies: Array.isArray(data.replies) ? data.replies : [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set((state) => ({
          notes: [note, ...state.notes],
        }));

        // sync remoto
        syncUpsertNote(note).catch(() => {
          // lo dejamos en local, ya se reintentará
        });

        return note;
      },

      updateNote: (id, patch) => {
        set((state) => {
          const notes = state.notes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  ...patch,
                  updated_at: new Date().toISOString(),
                }
              : n
          );
          return { notes };
        });

        const note = get().notes.find((n) => n.id === id);
        if (note) {
          syncUpsertNote(note).catch(() => {});
        }
      },

      // 👇 importante: siempre papelera primero
      deleteNote: (id) => {
        set((state) => {
          const notes = state.notes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  deleted: true,
                  archived: false,
                  updated_at: new Date().toISOString(),
                }
              : n
          );
          return { notes };
        });

        // avisar remoto de borrado lógico
        syncDeleteNote(id).catch(() => {});
      },

      restoreNote: (id) => {
        set((state) => {
          const notes = state.notes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  deleted: false,
                  updated_at: new Date().toISOString(),
                }
              : n
          );
          return { notes };
        });

        const note = get().notes.find((n) => n.id === id);
        if (note) {
          syncUpsertNote(note).catch(() => {});
        }
      },

      // 👇 este SÍ borra del todo, solo usar en papelera
      hardRemoveNote: (id) => {
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        }));

        syncHardDeleteNote(id).catch(() => {});
      },

      toggleArchive: (id) => {
        set((state) => {
          const notes = state.notes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  archived: !n.archived,
                  updated_at: new Date().toISOString(),
                }
              : n
          );
          return { notes };
        });

        const note = get().notes.find((n) => n.id === id);
        if (note) {
          syncUpsertNote(note).catch(() => {});
        }
      },

      toggleResolved: (id) => {
        set((state) => {
          const notes = state.notes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  resolved: !n.resolved,
                  updated_at: new Date().toISOString(),
                }
              : n
          );
          return { notes };
        });

        const note = get().notes.find((n) => n.id === id);
        if (note) {
          syncUpsertNote(note).catch(() => {});
        }
      },

      addReply: (id, reply) => {
        set((state) => {
          const notes = state.notes.map((n) => {
            if (n.id !== id) return n;
            const replies = Array.isArray(n.replies) ? n.replies.slice() : [];
            replies.push({
              ...reply,
              id: reply.id || uuid(),
              created_at: new Date().toISOString(),
            });
            return {
              ...n,
              replies,
              updated_at: new Date().toISOString(),
            };
          });
          return { notes };
        });

        const note = get().notes.find((n) => n.id === id);
        if (note) {
          syncUpsertNote(note).catch(() => {});
        }
      },
    }),
    {
      name: NOTES_STORAGE_KEY,
      version: 1,
    }
  )
);
