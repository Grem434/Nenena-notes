import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

/* --- Verificación temporal de variables Vite (solo en dev) --- */
if (import.meta.env?.DEV) {
  window.__NEN_ENV__ = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
  console.info("[ENV]", window.__NEN_ENV__);
}
/* --- Fin verificación temporal --- */

ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode> ⛔ Desactivado temporalmente
  <App />
  // </React.StrictMode>
);
