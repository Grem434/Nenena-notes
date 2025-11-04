
import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Minimal, dependency-free tooltip components compatible with
 * shadcn/ui API used in your code:
 *   <TooltipProvider>
 *     <Tooltip>
 *       <TooltipTrigger asChild>...</TooltipTrigger>
 *       <TooltipContent>Text</TooltipContent>
 *     </Tooltip>
 *   </TooltipProvider>
 *
 * Features:
 * - Desktop hover/focus tooltips
 * - Auto positions below or above trigger with sideOffset
 * - Accessible: role="tooltip", aria-describedby linking
 * - Ignores on touch devices (relies on title/aria-label already set)
 */

const Ctx = createContext({ delay: 150, disableHoverableContent: false });

export function TooltipProvider({ children, delayDuration = 150, disableHoverableContent = false }) {
  return <Ctx.Provider value={{ delay: delayDuration, disableHoverableContent }}>{children}</Ctx.Provider>;
}

const ItemCtx = createContext(null);

export function Tooltip({ children }) {
  const [open, setOpen] = useState(false);
  const [triggerEl, setTriggerEl] = useState(null);
  const [contentEl, setContentEl] = useState(null);
  const idRef = useRef(`tt-${Math.random().toString(36).slice(2, 9)}`);

  return (
    <ItemCtx.Provider value={{ open, setOpen, triggerEl, setTriggerEl, contentEl, setContentEl, idRef }}>
      {children}
    </ItemCtx.Provider>
  );
}

export function TooltipTrigger({ asChild = false, children }) {
  const ctx = useContext(Ctx);
  const { open, setOpen, setTriggerEl, idRef } = useContext(ItemCtx);
  const ref = useRef(null);
  const isTouch = typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)")?.matches || "ontouchstart" in window);

  useEffect(() => setTriggerEl(ref.current), [setTriggerEl]);

  const props = {
    ref,
    onMouseEnter: (e) => {
      if (isTouch) return;
      if (ctx?.delay) { clearTimeout(ref._tt); ref._tt = setTimeout(() => setOpen(true), ctx.delay); }
      else setOpen(true);
      children?.props?.onMouseEnter?.(e);
    },
    onMouseLeave: (e) => {
      clearTimeout(ref._tt);
      setOpen(false);
      children?.props?.onMouseLeave?.(e);
    },
    onFocus: (e) => { if (!isTouch) setOpen(true); children?.props?.onFocus?.(e); },
    onBlur: (e) => { setOpen(false); children?.props?.onBlur?.(e); },
    "aria-describedby": open ? idRef.current : undefined
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, props);
  }
  return <button type="button" {...props}>{children}</button>;
}

export function TooltipContent({ children, side = "top", sideOffset = 6, className = "", style }) {
  const { open, triggerEl, idRef, setContentEl } = useContext(ItemCtx);
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    setContentEl(ref.current);
  }, [setContentEl]);

  useEffect(() => {
    if (!open || !triggerEl || !ref.current) return;
    const update = () => {
      const r = triggerEl.getBoundingClientRect();
      const el = ref.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = 8;
      let top = (side === "top" ? r.top - (el.offsetHeight + sideOffset) : r.bottom + sideOffset);
      let left = r.left + (r.width - el.offsetWidth) / 2;
      if (left < pad) left = pad;
      if (left + el.offsetWidth > vw - pad) left = vw - el.offsetWidth - pad;
      if (top < pad) top = r.bottom + sideOffset;
      if (top + el.offsetHeight > vh - pad) top = Math.max(pad, vh - el.offsetHeight - pad);
      setPos({ top, left });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update, true);
    return () => {
      try { ro.disconnect(); } catch {}
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update, true);
    };
  }, [open, triggerEl, side, sideOffset]);

  if (!open) return null;
  return createPortal(
    <div
      id={idRef.current}
      role="tooltip"
      ref={ref}
      className={
        "fixed z-[60] rounded-md border border-slate-200 bg-white/95 backdrop-blur px-2 py-1 shadow-md text-slate-700 " +
        "text-[12px] select-none " + className
      }
      style={{ top: pos.top, left: pos.left, ...style }}
    >
      {children}
    </div>,
    document.body
  );
}

export default { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };
