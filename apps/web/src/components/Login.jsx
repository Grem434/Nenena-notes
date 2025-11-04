import { useEffect, useState } from "react";
import { Lock, User2, Eye, EyeOff } from "lucide-react";

const ICON = "/icons/icon192.png";
const TITLE = "Nenena – notes";

// Credenciales fijas
const VALID_USER = "Showroom";
const VALID_PASS = "pLaI(cv6Rim";

export default function Login({ onSuccess }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  // Intento reducir autofill agresivo (no es 100% evitable en todos los navegadores)
  useEffect(() => {
    try {
      // Evitar zoom al foco en iOS: no aplicamos aquí para no tocar estilos globales
    } catch {}
  }, []);

  const submit = (e) => {
    e.preventDefault();
    setError("");

    if (user.trim() === VALID_USER && pass === VALID_PASS) {
      try {
        localStorage.setItem("nenena-auth", "ok");
        localStorage.setItem("nenena_auth", "ok"); // compat
        localStorage.setItem("nenena-auth-user", VALID_USER);
      } catch {}
      onSuccess?.(VALID_USER);
      return;
    }
    setError("Usuario o contraseña incorrectos.");
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6">
          <div className="flex items-center gap-3 mb-4">
            <img
              src={ICON}
              width="40"
              height="40"
              alt="Nenena Notes"
              className="rounded-xl border border-slate-200"
              loading="eager"
              decoding="async"
            />
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
              {TITLE}
            </h1>
          </div>

          <p className="text-sm text-slate-600 mb-4">
            Acceso interno. Introduce usuario y contraseña.
          </p>

          {/* Señuelos para desactivar autofill visible */}
          <form onSubmit={submit} autoComplete="off" className="space-y-3">
            <input
              type="text"
              name="fake-user"
              autoComplete="username"
              tabIndex={-1}
              style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }}
              aria-hidden="true"
            />
            <input
              type="password"
              name="fake-pass"
              autoComplete="current-password"
              tabIndex={-1}
              style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }}
              aria-hidden="true"
            />

            <div className="relative">
              <label className="block text-xs text-slate-500 mb-1">Usuario</label>
              <div className="relative">
                <User2 className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="x-username"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  autoComplete="off"
                  placeholder="Usuario"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="w-full pl-8 pr-3 h-10 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs text-slate-500 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type={show ? "text" : "password"}
                  name="x-password"
                  autoComplete="off"
                  placeholder="Contraseña"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="w-full pl-8 pr-10 h-10 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                  tabIndex={-1}
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-10 rounded-lg bg-pink-500 text-white font-semibold hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              Entrar
            </button>
          </form>

          <p className="text-[11px] text-slate-400 mt-4 text-center">
            Recomendado instalar como App (PWA) para un acceso más ágil.
          </p>
        </div>
      </div>
    </div>
  );
}
