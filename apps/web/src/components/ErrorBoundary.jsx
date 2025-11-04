import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "", stack: "", info: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Error desconocido" };
  }

  componentDidCatch(error, info) {
    console.error("🧩 React ErrorBoundary capturó:", error, info);
    this.setState({ stack: error?.stack || "", info: info?.componentStack || "" });
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: "", stack: "", info: "" });
    try { this.props.onReset?.(); } catch {}
  };

  handleCopy = async () => {
    const payload = [
      "Nenena Notes — Error",
      `Mensaje: ${this.state.message}`,
      this.state.stack ? `Stack:\n${this.state.stack}` : null,
      this.state.info ? `Component stack:\n${this.state.info}` : null,
      `UserAgent: ${navigator.userAgent}`,
      `URL: ${location.href}`,
      `Fecha: ${new Date().toISOString()}`
    ].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(payload);
      alert("Detalles copiados al portapapeles");
    } catch {
      alert("No se pudo copiar. Puedes seleccionar el texto y copiarlo manualmente.");
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#fff3f6",
          color: "#334155",
          padding: "24px"
        }}>
          <div style={{
            maxWidth: 560,
            width: "100%",
            background: "#ffffff",
            border: "1px solid #fbcfe8",
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(242,113,142,.12)",
            padding: "20px 18px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 9999, background: "#f472b6" }} />
              <h2 style={{ margin: 0, color: "#be185d", fontSize: 18, fontWeight: 700 }}>Ups, algo ha fallado</h2>
            </div>
            <p style={{ margin: "6px 0 14px", fontSize: 14 }}>
              {this.state.message}
            </p>

            {(this.state.stack || this.state.info) && (
              <details style={{ marginBottom: 12, fontSize: 12 }}>
                <summary style={{ cursor: "pointer", color: "#7c3aed" }}>Ver detalles técnicos</summary>
                <pre style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
{this.state.stack || ""}

{this.state.info || ""}
                </pre>
              </details>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={this.handleRetry}
                style={{
                  background: "#f472b6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Reintentar
              </button>
              <button
                onClick={this.handleCopy}
                style={{
                  background: "#ffffff",
                  color: "#be185d",
                  border: "1px solid #fbcfe8",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Copiar detalle
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  marginLeft: "auto",
                  background: "#ffe4e6",
                  color: "#881337",
                  border: "1px solid #fecdd3",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Recargar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
