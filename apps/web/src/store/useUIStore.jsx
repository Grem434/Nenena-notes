import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUIStore = create(
  persist(
    (set, get) => ({
      // Hover global (resaltado por usuario)
      hoveredUser: null,
      setHoveredUser: (name) => set({ hoveredUser: name }),
      clearHoveredUser: () => set({ hoveredUser: null }),

      // Nota enfocada (vista ampliada)
      focusedNoteId: null,
      setFocusedNote: (id) => set({ focusedNoteId: id }),
      clearFocusedNote: () => set({ focusedNoteId: null }),
      isFocusOpen: () => get().focusedNoteId !== null,

      // Vista compacta del grid (persistente)
      isCompactView: false,
      setCompact: (v) => set({ isCompactView: v }),
      toggleCompact: () =>
        set((state) => ({ isCompactView: !state.isCompactView })),

      // Sidebar móvil de destinatarios (ya lo teníamos)
      showRecipientsMobile: false,
      openRecipientsMobile: () => set({ showRecipientsMobile: true }),
      closeRecipientsMobile: () => set({ showRecipientsMobile: false }),
      toggleRecipientsMobile: () =>
        set((state) => ({ showRecipientsMobile: !state.showRecipientsMobile })),

      // ✅ Sidebar móvil principal (nuevo)
      showMainSidebar: false,
      openMainSidebar: () => set({ showMainSidebar: true }),
      closeMainSidebar: () => set({ showMainSidebar: false }),
      toggleMainSidebar: () =>
        set((state) => ({ showMainSidebar: !state.showMainSidebar })),
    }),
    { name: "nenena_ui" }
  )
);
