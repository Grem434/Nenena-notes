export function isMobileUA() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || "";
  // iOS / Android / generic mobile indicators
  return /iPhone|iPad|iPod|Android|Mobile/i.test(ua);
}
