// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

/** Lee variables de entorno de forma segura (Vite, window.__ENV, localStorage) */
function readViteEnv() {
  try {
    // En Vite/ESM, import.meta.env existe; si no, saltará el catch
    return (import.meta && import.meta.env) || {};
  } catch {
    return {};
  }
}
function getEnv() {
  const vite = readViteEnv();
  const win =
    (typeof window !== "undefined" && window.__ENV) || {};
  let ls = {};
  try {
    ls = {
      VITE_SUPABASE_URL:
        localStorage.getItem("VITE_SUPABASE_URL") || undefined,
      VITE_SUPABASE_ANON_KEY:
        localStorage.getItem("VITE_SUPABASE_ANON_KEY") || undefined,
    };
  } catch {}
  return {
    VITE_SUPABASE_URL:
      vite.VITE_SUPABASE_URL || win.VITE_SUPABASE_URL || ls.VITE_SUPABASE_URL || "",
    VITE_SUPABASE_ANON_KEY:
      vite.VITE_SUPABASE_ANON_KEY || win.VITE_SUPABASE_ANON_KEY || ls.VITE_SUPABASE_ANON_KEY || "",
  };
}

/** Normaliza URLs con esquemas duplicados u otros fallos típicos */
function normalizeUrl(u) {
  if (!u || typeof u !== "string") return "";
  let s = u.trim();

  // "https:https://xxx..." -> "https://xxx..."
  s = s.replace(/^https:\s*https:\/\//i, "https://");
  s = s.replace(/^http:\s*http:\/\//i, "http://");

  // "http(s)://http(s)://..." -> deja sólo el segundo
  s = s.replace(/^(https?:\/\/)+(https?:\/\/)/i, "$2");

  // Normaliza mayúsculas del esquema y barras extra
  s = s.replace(/^https?:\/\//i, (m) => m.toLowerCase());
  s = s.replace(/^(https?:)\/\/\/+/i, "$1//");

  return s;
}

const { VITE_SUPABASE_URL: RAW_URL, VITE_SUPABASE_ANON_KEY: RAW_ANON } = getEnv();
const url  = normalizeUrl(RAW_URL || "");
const anon = (RAW_ANON || "").trim();

let client = null;

try {
  console.info("[supabase] ENV url (raw→clean):", { rawUrl: RAW_URL || "", url: url || "(vacía)" });
  console.info("[supabase] anonKey prefix:", anon ? anon.slice(0, 10) + "…" : "(vacía)");

  if (url && /^https?:\/\/[^ ]+/i.test(url) && anon) {
    client = createClient(url, anon);
    console.info("[supabase] Cliente creado correctamente.");
  } else {
    console.warn("[supabase] URL o ANON KEY ausente/incorrecta. Modo local-only.", { url, hasAnon: !!anon });
  }
} catch (e) {
  console.warn("[supabase] No se pudo crear el cliente. Modo local-only.", e);
}

/** Exports usados en la app */
export const supabase = client;
export const hasSupabase = !!client;

/** Compat con sync.js */
export function getSupabase() {
  return client; // puede ser null si no hay ENV válidos
}
