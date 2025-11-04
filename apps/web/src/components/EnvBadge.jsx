export default function EnvBadge() {
  const mode = import.meta.env.MODE || "development";
  const label = (import.meta.env.VITE_APP_ENV || mode).toUpperCase();
  const isProd = label === "PRODUCTION" || label === "PROD";

  if (isProd) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        left: 10,
        zIndex: 1000,
        background: label.includes("STAG") ? "#0ea5e9" : "#f59e0b",
        color: "white",
        padding: "6px 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 700,
        boxShadow: "0 6px 20px rgba(0,0,0,.15)",
        letterSpacing: ".3px",
        userSelect: "none"
      }}
      aria-label={`Entorno ${label}`}
      title={`Entorno ${label}`}
    >
      {label}
    </div>
  );
}
