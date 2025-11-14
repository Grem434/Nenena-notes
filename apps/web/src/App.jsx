import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import NoteCard from "@/components/NoteCard";
import NoteModal from "@/components/NoteModal";
import RecipientsSidebar from "@/components/RecipientsSidebar";
import { useNotesStore } from "@/store/useNotesStore";
import { useUsersStore } from "@/store/useUsersStore";
import { useUIStore } from "@/store/useUIStore";
import { useStyleStore } from "@/store/useStyleStore";
import { SoundProvider } from "@/providers/SoundProvider";
import ToasterNenena from "@/components/ui/ToasterNenena";
import { notify } from "@/lib/notify";
import { registerQuickNoteEndpoint } from "@/api/apiQuickNote";
import Login from "@/components/Login";
import { cn } from "@/lib/utils";
import MobileDock from "@/components/MobileDock";
import UsersSheetMobile from "@/components/UsersSheetMobile";
import { pullAllNotes, startNotesSync, stopNotesSync } from "@/lib/sync";
import NoteSkeletons from "@/components/NoteSkeletons";
import VirtualList from "@/components/VirtualList";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import { isMobileUA } from "@/lib/isMobile";

const NoteFocusLazy = lazy(() => import("@/components/NoteFocus"));

// 🔖 id de build para invalidar caché de forma segura
const BUILD_ID = import.meta.env.VITE_BUILD_ID || "dev";

// Limpieza SUAVE: solo nuestras claves; features opcionales con try/catch
async function clearNenenaLocalDataSoft() {
  try {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("nenena-") || k.startsWith("nenena_")) {
        localStorage.removeItem(k);
      }
    });
  } catch {}
  // IndexedDB: elimina DBs que empiecen por nenena-
  try {
    if (indexedDB?.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs
          .filter((d) => d?.name && d.name.startsWith("nenena-"))
          .map((d) => indexedDB.deleteDatabase(d.name))
      );
    }
  } catch {}
  // Cache Storage: borra caches con nuestro prefijo (si los tuvieras nombrados)
  try {
    const keys = await caches?.keys?.();
    if (Array.isArray(keys)) {
      await Promise.all(
        keys
          .filter((k) => k.startsWith("nenena-"))
          .map((k) => caches.delete(k))
      );
    }
  } catch {}
}



// Debounce
function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// --- Bridge: responder lista de usuarios a la extensión (derivado de notas) ---
function useNenenaUsersBridgeFromNotes() {
  // OJO: no usamos el hook dentro de collectUsers (evitamos render loops); leemos una snapshot en el efecto
  useEffect(() => {
    function normalize(list) {
      const seen = new Map();
      for (const name of list) {
        const s = String(name || "").trim();
        if (!s) continue;
        const k = s.toLowerCase();
        if (k === "todos") continue; // lo añadimos al final
        if (!seen.has(k)) seen.set(k, s);
      }
      const ordered = Array.from(seen.values()).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );
      ordered.push("TODOS");
      return ordered;
    }

    function onMessage(ev) {
      const d = ev?.data;
      if (!d || d.type !== "nenena:request-users") return;
      try {
        // Snapshot de notas actual desde la store
        const st = useNotesStore.getState?.();
        const notes = Array.isArray(st?.notes) ? st.notes : [];

        // Deriva usuarios de from/to
        const names = new Set();
        for (const n of notes) {
          if (n?.from) names.add(String(n.from));
          if (n?.to) names.add(String(n.to));
        }
        const users = normalize(Array.from(names));
        window.postMessage({ type: "nenena:users", users }, "*");
        // console.log("[UsersBridge] responded", users);
      } catch {
        window.postMessage({ type: "nenena:users", users: ["TODOS"] }, "*");
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);

  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [search, setSearchState] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const isFiltering = search !== debouncedSearch;
  const [selectedPersonal, setSelectedPersonal] = useState(null);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [openUsers, setOpenUsers] = useState(false);
  
  // Habilita respuesta de usuarios para la extensión (derivado de notas)
  useNenenaUsersBridgeFromNotes();

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const notes = useNotesStore((s) => s.notes ?? []);
  const addNote = useNotesStore((s) => s.addNote);
  const filter = useNotesStore((s) => s.filter);
  const setFilter = useNotesStore((s) => s.setFilter);
  const applyRemoteNote = useNotesStore((s) => s.applyRemoteNote);
  const applyRemoteNotes = useNotesStore((s) => s.applyRemoteNotes);

  useUsersStore((s) => s.users ?? []);
  const isCompactView = useUIStore((s) => s.isCompactView);
  const toggleCompact = useUIStore((s) => s.toggleCompact);
  const setFocusedNote = useUIStore((s) => s.setFocusedNote);
  const cardTone = useStyleStore((s) => s.cardTone);

    useEffect(() => {
    if (selectedRecipient && filter !== "todas") {
      setSelectedRecipient(null);
    }
  }, [filter, selectedRecipient]);

  // ✅ Invalida caché local cuando cambia el build (sin romper el arranque)
  useEffect(() => {
    (async () => {
      try {
        const prev = localStorage.getItem("nenena-build-id");
        if (prev !== BUILD_ID) {
          await clearNenenaLocalDataSoft();
          localStorage.setItem("nenena-build-id", BUILD_ID);

          // Pull inicial tras limpiar (sin recargar la página)
          try { useUsersStore.getState().pullRemote?.(); } catch {}
          try {
            const { data, error } = await pullAllNotes();
            if (!error && Array.isArray(data)) {
              applyRemoteNotes(data);
            }
          } catch {}
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔁 Auto-pull cada 90s (mantener Edge/Chrome alineados)
  useEffect(() => {
    const id = setInterval(() => {
      try { useUsersStore.getState().pullRemote?.(); } catch {}
      try {
        pullAllNotes().then((r) => {
          if (Array.isArray(r?.data)) applyRemoteNotes(r.data);
        });
      } catch {}
    }, 90_000);
    return () => clearInterval(id);
  }, [applyRemoteNotes]);

  useEffect(() => {
    try {
      const auth =
        localStorage.getItem("nenena_auth") ||
        localStorage.getItem("nenena-auth");
      setAuthenticated(auth === "ok");
    } catch {
      setAuthenticated(false);
    }
  }, []);
  const handleLoginSuccess = () => {
    try {
      localStorage.setItem("nenena_auth", "ok");
      localStorage.setItem("nenena-auth", "ok");
    } catch {}
    setAuthenticated(true);
  };
  const handleLogout = () => {
    try {
      localStorage.removeItem("nenena_auth");
      localStorage.removeItem("nenena-auth");
      localStorage.removeItem("nenena-auth-user");
    } catch {}
    setAuthenticated(false);
  };

  useEffect(() => {
    registerQuickNoteEndpoint(
      addNote,
      () =>
        notify({
          variant: "info",
          title: "Nota rápida",
          description: "Se añadió una nueva nota",
        }),
      (msg) => notify({ variant: "info", title: msg })
    );
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, [addNote]);

  useEffect(() => {
    if (!authenticated) return;
    let stop = null;
    (async () => {
      const { data, error } = await pullAllNotes();
      if (!error && Array.isArray(data)) applyRemoteNotes(data);
      stop = startNotesSync({
        onUpsert: (row, eventType) => applyRemoteNote(row, eventType),
      });
    })();
    return () => {
      try { stop && stop(); } catch {}
      stopNotesSync();
    };
  }, [authenticated, applyRemoteNote, applyRemoteNotes]);

  // 📥 Quick Notes desde la extensión (bridge por window.postMessage)
  useEffect(() => {
    function onQuickNotes(ev) {
      const d = ev?.data;
      if (!d || d.source !== "nenena-quicknote" || d.type !== "nenena:quicknotes") return;
      const notes = Array.isArray(d.notes) ? d.notes : [];
      if (!notes.length) return;

      let created = 0;
      for (const n of notes) {
        // Normaliza al modelo de la store
        addNote({
          text: String(n?.text ?? "").trim(),
          from: String(n?.from ?? ""),
          to: String(n?.to ?? ""),
          status: n?.status === "resuelta" ? "resuelta" : "pendiente",
          archived: !!n?.archived, // por defecto false
          createdAt: n?.createdAt || new Date().toISOString(),
        });
        created++;
      }

      // Aviso visual
      try {
        notify({
          variant: "info",
          title: "Notas rápidas",
          description: created === 1 ? "Se añadió 1 nota" : `Se añadieron ${created} notas`,
        });
      } catch {}

      // ACK opcional para el content script (logs)
      try {
        window.postMessage({ type: "nenena:quicknotes:ack", received: created }, "*");
      } catch {}
    }
    window.addEventListener("message", onQuickNotes);
    return () => window.removeEventListener("message", onQuickNotes);
  }, [addNote]);
  
  // 🛟 Reconciliación agresiva (solo móvil) para evitar notas fantasma y desincronía de colores
  useEffect(() => {
    const refreshAll = () => {
      try { useNotesStore.getState().hardRefreshNotesFromBackend?.({ overwrite: true }); } catch {}
      try { useUsersStore.getState().hardRefreshUsersFromBackend?.({ overwrite: true }); } catch {}
    };
    try { if (isMobileUA()) refreshAll(); } catch {}

    const onFocus = () => refreshAll();
    const onVisible = () => { if (document.visibilityState === "visible") refreshAll(); };
    const onOnline = () => refreshAll();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    let timer = null;
    try { if (isMobileUA()) timer = setInterval(refreshAll, 60000); } catch {}

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      if (timer) clearInterval(timer);
    };
  }, []);

  // 🔄 Pull de colores en foco/visible/online
  useEffect(() => {
    const pull = () => {
      try { useUsersStore.getState().pullRemote?.(); } catch (e) { console.warn("[users] pullRemote@App error", e); }
    };
    pull();
    const onFocus = () => pull();
    const onVisible = () => (document.visibilityState === "visible" ? pull() : null);
    const onOnline = () => pull();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, []);


  const isPersonal = (n) => n.from && n.to && n.from === n.to;

  useEffect(() => {
    if (!authenticated) return;
    const isEditable = (el) => {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      const ed = el.getAttribute?.("contenteditable");
      return tag === "input" || tag === "textarea" || ed === "" || ed === "true";
    };
    const onKey = (e) => {
      const key = e.key.toLowerCase();
      if (isEditable(e.target) || e.ctrlKey || e.altKey || e.metaKey) return;

      if (key === "n") { e.preventDefault(); setOpen(true); return; }
      if (key === "f") { e.preventDefault(); window.dispatchEvent(new Event("nenena:focus-search")); return; }
      if (["1","2","3","4","5"].includes(key)) {
        e.preventDefault();
        const map={"1":"todas","2":"pendiente","3":"resuelta","4":"archivadas","5":"papelera"};
        setFilter(map[key]); setSelectedPersonal(null); setSelectedRecipient(null); return;
      }
      if (key === "escape") {
        if (helpOpen) { e.preventDefault(); setHelpOpen(false); return; }
        if (open) { e.preventDefault(); setOpen(false); return; }
        setFocusedNote(null); return;
      }
      if (key === "?" || (e.shiftKey && key === "/")) { e.preventDefault(); setHelpOpen(true); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authenticated, open, helpOpen, setFilter, setFocusedNote]);

  const filtered = useMemo(() => {
    if (!authenticated || !ready) return [];
    if (!Array.isArray(notes)) return [];
    let list = [];
    if (selectedRecipient) {
      list = notes.filter((n) => n.to === selectedRecipient && !n.deleted && !n.archived && !isPersonal(n));
    } else {
      switch (filter) {
  case "todas":
    list = notes.filter(
      (n) => !n.archived && !n.deleted && !isPersonal(n)
    );
    break;

  case "pendiente":
    list = notes.filter(
      (n) =>
        n.status === "pendiente" &&
        !n.archived &&
        !n.deleted &&
        !isPersonal(n)
    );
    break;

  case "resuelta":
    list = notes.filter(
      (n) =>
        n.status === "resuelta" &&
        !n.archived &&
        !n.deleted &&
        !isPersonal(n)
    );
    break;

  case "archivadas":
    list = notes.filter(
      (n) => n.archived && !n.deleted && !isPersonal(n)
    );
    break;

  case "personales":
    if (selectedPersonal)
      list = notes.filter(
        (n) =>
          n.from === selectedPersonal &&
          n.to === selectedPersonal &&
          !n.archived &&
          !n.deleted
      );
    break;

  case "papelera":
    // 👇 aquí el cambio importante: muestra TODAS las borradas
    list = notes.filter((n) => n.deleted);
    break;

  default:
    list = notes.filter(
      (n) => !n.archived && !n.deleted && !isPersonal(n)
    );
}
    }
    if (debouncedSearch.trim()) {
      const term = debouncedSearch.toLowerCase();
      list = list.filter((n) =>
        n.text?.toLowerCase().includes(term) ||
        n.from?.toLowerCase().includes(term) ||
        n.to?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [authenticated, ready, notes, filter, selectedPersonal, selectedRecipient, debouncedSearch]);

  const viewLabel = useMemo(() => {
    if (selectedRecipient) return `📨 Notas para ${selectedRecipient}`;
    switch (filter) {
      case "todas": return "📬 Todas las notas";
      case "pendiente": return "⏳ Pendientes";
      case "resuelta": return "✅ Resueltas";
      case "archivadas": return "📦 Archivadas";
      case "personales": return selectedPersonal ? `👤 Personales de ${selectedPersonal}` : "👤 Personales";
      case "papelera": return "🗑️ Papelera";
      default: return "📬 Todas las notas";
    }
  }, [filter, selectedRecipient, selectedPersonal]);

  const virtualResetKey = `${filter}|${selectedRecipient ?? ""}|${selectedPersonal ?? ""}|${debouncedSearch}`;

  if (!authenticated) return <Login onSuccess={handleLoginSuccess} />;

  if (!ready) {
    return (
      <div className="h-screen flex flex-col">
        <div className="h-14 border-b"></div>
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4">
          <NoteSkeletons variant="grid" count={8} />
        </div>
      </div>
    );
  }

  // Cuadrícula (ajusta 240 si quieres otro tamaño)
  const gridStyle = !isCompactView
    ? { gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }
    : undefined;

  return (
    <SoundProvider>
      <div className="flex h-screen text-slate-800 bg-white overflow-hidden">
        <Sidebar
          onLogout={handleLogout}
          selectedPersonal={selectedPersonal}
          setSelectedPersonal={setSelectedPersonal}
          setSelectedRecipient={setSelectedRecipient}
        />

        <div className="flex-1 flex flex-col min-w-0 border-x border-slate-100">
          <Navbar
            onNew={() => setOpen(true)}
            search={search}
            setSearch={setSearchState}
            isCompactView={isCompactView}
            toggleCompact={toggleCompact}
            onOpenUsers={() => setOpenUsers(true)}
            onOpenHelp={() => setHelpOpen(true)}
          />

          <div className="sticky top-[56px] z-10 bg-white/85 backdrop-blur-md border-b border-slate-100">
            <div className="max-w-7xl mx-auto w-full px-4 py-2">
              <h2 className="text-sm font-medium text-slate-600 select-none">
                {viewLabel}
              </h2>
            </div>
          </div>

          <main className={cn("flex-1 overflow-y-auto contain-strict","pb-[calc(64px+env(safe-area-inset-bottom,0px))] md:pb-6")}>
            <div
              className={cn(
                "max-w-7xl mx-auto w-full px-3 sm:px-4",
                isCompactView
                  ? "flex flex-col gap-2.5 sm:gap-3 pt-3"
                  : [
                      "grid pt-4",
                      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
                      "gap-3 sm:gap-4 xl:gap-5",
                      "auto-rows-[minmax(180px,_auto)]",
                    ].join(" ")
              )}
              style={gridStyle}
            >
              {isFiltering ? (
                isCompactView ? <NoteSkeletons variant="list" count={6} /> : <NoteSkeletons variant="grid" count={8} />
              ) : isCompactView ? (
                <VirtualList
                  items={filtered}
                  resetKey={virtualResetKey}
                  initialCount={40}
                  step={40}
                  overscan={0}
                  renderItem={(n) => (
                    <NoteCard key={n.id} note={n} variant="list" tone={cardTone} />
                  )}
                />
              ) : filtered.length > 0 ? (
                filtered.map((n) => (
                  <NoteCard key={n.id} note={n} variant="grid" tone={cardTone} />
                ))
              ) : (
                <div className="col-span-full text-center text-slate-400 mt-16">
                  <p className="text-base mb-1">✨ No hay notas para mostrar</p>
                  <p className="text-sm">
                    Usa los filtros del lateral o pulsa <span className="text-pink-500 font-medium">➕ Nueva nota</span>.
                  </p>
                </div>
              )}
            </div>
          </main>

          <Suspense fallback={
            <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
              <div className="animate-pulse text-pink-500 text-sm bg.white/70 backdrop-blur rounded-full px-3 py-1 border border-pink-200">
                Cargando detalle…
              </div>
            </div>
          }>
            <NoteFocusLazy />
          </Suspense>

          <div className="net-fab">
            <div className={`net-pill ${isOnline ? "on" : "off"}`}>
              {isOnline ? "Conectado" : "Sin conexión — trabajando en local"}
            </div>
          </div>
        </div>

        <RecipientsSidebar
          selectedRecipient={selectedRecipient}
          setSelectedRecipient={setSelectedRecipient}
          onSelectInbound={(name) => {
            setSelectedPersonal(null);
            setSelectedRecipient(name);
            setFilter("todas");
          }}
          onSelectPersonal={(name) => {
            setSelectedRecipient(null);
            setSelectedPersonal(name);
            setFilter("personales");
          }}
        />


        <NoteModal
          open={open}
          onOpenChange={setOpen}
          onSave={(data) => addNote({ ...data, archived: false })}
        />
      </div>

      <MobileDock />

      <UsersSheetMobile
        open={openUsers}
        onOpenChange={setOpenUsers}
        onSelectInbound={(name) => {
          setSelectedPersonal(null);
          setSelectedRecipient(name);
          setFilter("todas");
        }}
        onSelectPersonal={(name) => {
          setSelectedRecipient(null);
          setSelectedPersonal(name);
          setFilter("personales");
        }}
      />

      <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />

      <ToasterNenena />
    </SoundProvider>
  );
}
