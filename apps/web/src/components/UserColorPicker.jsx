import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/* ===== Utilidades de color ===== */
const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n ?? 0)));
const cleanHSV = (c) => ({
  h: ((Number(c?.h) || 0) % 360 + 360) % 360,
  s: clamp(c?.s, 0, 100),
  v: clamp(c?.v, 0, 100),
});
const hsvToRgb = ({ h, s, v }) => {
  const S = s / 100, V = v / 100;
  const C = V * S, X = C * (1 - Math.abs(((h / 60) % 2) - 1)), m = V - C;
  let r = 0, g = 0, b = 0;
  if (h <  60) [r,g,b] = [C,X,0];
  else if (h < 120) [r,g,b] = [X,C,0];
  else if (h < 180) [r,g,b] = [0,C,X];
  else if (h < 240) [r,g,b] = [0,X,C];
  else if (h < 300) [r,g,b] = [X,0,C];
  else             [r,g,b] = [C,0,X];
  return {
    r: Math.round((r+m)*255),
    g: Math.round((g+m)*255),
    b: Math.round((b+m)*255),
  };
};
const rgbToHex = ({ r, g, b }) =>
  `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
const hsvToHex = (hsv) => rgbToHex(hsvToRgb(hsv));

/**
 * Props:
 *  - user: { name, color:{h,s,v} }
 *  - anchorRect?: DOMRect para posicionar
 *  - onClose?: () => void
 *  - onConfirm?: (name, hsv) => void
 */
export default function UserColorPicker({ user, anchorRect, onClose, onConfirm }) {
  // ⚠️ Importante: NO hacer early-return antes de declarar todos los hooks
  const isMobile =
    typeof window !== "undefined" && window.matchMedia("(max-width: 767.98px)").matches;

  // Estado de montaje
  const [mounted, setMounted] = useState(false);

  // Estado de selección (siempre declarado)
  const initial = cleanHSV(user?.color || { h: 200, s: 80, v: 90 });
  const [hsv, setHSV] = useState(initial);
  const [isOpen, setIsOpen] = useState(true);

  // Refs para drag
  const svRef = useRef(null);
  const hueRef = useRef(null);
  const dragging = useRef(null);
  const containerRef = useRef(null);

  // Efectos de ciclo de vida
  useEffect(() => {
    setMounted(true);
  }, []);

  // Autocerrar en móvil, pero SIN cortar hooks
  useEffect(() => {
    if (mounted && isMobile) {
      onClose?.();
      setIsOpen(false);
    }
  }, [mounted, isMobile, onClose]);

  // ESC y click-fuera
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close(false);
    const onClick = (e) => {
      const el = containerRef.current;
      if (el && !el.contains(e.target)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("touchstart", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick);
    };
    // isOpen en deps no es necesario; queremos listeners una vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helpers de drag
  const getPoint = (e) => {
    const t = e.touches?.[0];
    return { x: (t ? t.clientX : e.clientX) ?? 0, y: (t ? t.clientY : e.clientY) ?? 0 };
  };
  const startSV = (e) => { dragging.current = "sv"; moveSV(e); };
  const moveSV = (e) => {
    if (dragging.current !== "sv") return;
    const el = svRef.current; if (!el) return;
    const { x, y } = getPoint(e);
    const rect = el.getBoundingClientRect();
    const s = clamp(((x - rect.left) / rect.width) * 100, 0, 100);
    const v = clamp((1 - (y - rect.top) / rect.height) * 100, 0, 100);
    setHSV((p) => ({ ...p, s, v }));
  };
  const startHue = (e) => { dragging.current = "h"; moveHue(e); };
  const moveHue = (e) => {
    if (dragging.current !== "h") return;
    const el = hueRef.current; if (!el) return;
    const { y } = getPoint(e);
    const rect = el.getBoundingClientRect();
    const h = clamp(((y - rect.top) / rect.height) * 360, 0, 360);
    setHSV((p) => ({ ...p, h }));
  };
  const endDrag = () => (dragging.current = null);

  // Cierre
  const close = (save) => {
    if (save) {
      if (typeof onConfirm === "function") onConfirm(user?.name, cleanHSV(hsv));
      else {
        window.dispatchEvent(
          new CustomEvent("nenena:user-color-confirm", {
            detail: { name: user?.name, color: cleanHSV(hsv) },
          })
        );
      }
    }
    onClose?.();
    setIsOpen(false);
  };

  // Posicionamiento del popover
  const stylePopover = (() => {
    let top = 80, left = 80;
    if (anchorRect) {
      const margin = 8;
      top = Math.max(8, anchorRect.top - 300 - margin);
      left = Math.min(Math.max(8, anchorRect.left - 20), window.innerWidth - 340);
    }
    return { top, left, position: "fixed" };
  })();

  // Colores UI
  const hueHex = hsvToHex({ h: hsv.h, s: 100, v: 100 });
  const preview = hsvToHex(hsv);

  // Guard de visibilidad (sin cortar hooks)
  const shouldHide = !mounted || !isOpen || isMobile;
  if (shouldHide) return null;

  return (
    <div
      ref={containerRef}
      className="z-[100] rounded-2xl shadow-2xl border bg-white w-[330px] select-none"
      style={stylePopover}
      role="dialog"
      aria-label={`Color de ${user?.name || ""}`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-4 h-4 rounded-full border"
            style={{ backgroundColor: preview, borderColor: "#0002" }}
            aria-hidden
          />
          <span className="text-[13px] font-medium">
            Color de <strong>{user?.name}</strong>
          </span>
        </div>
        <button onClick={() => close(false)} className="p-1 rounded-md hover:bg-slate-100" aria-label="Cerrar">
          <X size={16} />
        </button>
      </div>

      {/* BODY */}
      <div className="p-3 grid grid-cols-[1fr,30px] gap-3">
        {/* SV */}
        <div
          ref={svRef}
          className="relative h-[200px] rounded-xl overflow-hidden cursor-crosshair"
          onMouseDown={startSV}
          onMouseMove={moveSV}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={startSV}
          onTouchMove={moveSV}
          onTouchEnd={endDrag}
          style={{ background: `linear-gradient(to right, #fff, ${hueHex})` }}
        >
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #000, transparent)" }} />
          <div
            className="absolute w-4 h-4 rounded-full border-2 border-white shadow -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${hsv.s}%`,
              top: `${100 - hsv.v}%`,
              background: preview,
              boxShadow: "0 0 0 1px rgba(0,0,0,.25)",
            }}
          />
        </div>

        {/* HUE */}
        <div
          ref={hueRef}
          className="relative h-[200px] rounded-xl cursor-pointer"
          onMouseDown={startHue}
          onMouseMove={moveHue}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={startHue}
          onTouchMove={moveHue}
          onTouchEnd={endDrag}
          style={{
            background:
              "linear-gradient(to bottom, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
          }}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 w-6 h-2 rounded-full border border-white shadow"
            style={{
              top: `${(hsv.h / 360) * 100}%`,
              background: hueHex,
              boxShadow: "0 0 0 1px rgba(0,0,0,.25)",
            }}
          />
        </div>

        {/* PREVIEW */}
        <div className="col-span-2 flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-7 h-7 rounded-full border"
              style={{ backgroundColor: preview, borderColor: "#0002" }}
              aria-label="Vista previa"
            />
            <span className="text-[12px] text-slate-600 font-mono">
              {preview.toUpperCase()}
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            H:{Math.round(hsv.h)} · S:{Math.round(hsv.s)} · V:{Math.round(hsv.v)}
          </span>
        </div>
      </div>

      {/* FOOTER */}
      <div className="px-3 pb-3 flex items-center justify-end gap-2">
        <button onClick={() => close(false)} className="px-3 py-1.5 rounded-lg border text-[13px] hover:bg-slate-50">
          Cancelar
        </button>
        <button
          onClick={() => close(true)}
          className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-[13px] hover:bg-rose-500/90 shadow-sm"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
