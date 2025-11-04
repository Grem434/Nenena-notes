export default function TestCrash() {
  if (typeof window !== "undefined" && window.location.hash === "#break") {
    throw new Error("Simulación controlada: ErrorBoundary en acción");
  }
  return null;
}
