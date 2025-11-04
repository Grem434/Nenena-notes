import React, { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";

/**
 * VirtualList
 * -----------
 * Virtualiza la vista compacta (lista).
 *
 * Props:
 * - items: any[]
 * - renderItem: (item: any) => ReactNode
 * - itemSize?: number          // altura estimada por fila (px). Default: 56
 * - overscan?: number          // filas extra por arriba/abajo. Default: 6
 * - resetKey?: string          // cambia para resetear scroll/estado
 * - initialCount?: number      // número inicial para “progressive reveal”. Default: 40
 * - step?: number              // incremento cuando llegas al final. Default: 40
 * - scrollParentRef?: Ref<HTMLElement> // opcional: contenedor con overflow-y
 */
export default function VirtualList({
  items,
  renderItem,
  itemSize = 56,
  overscan = 6,
  resetKey = "",
  initialCount = 40,
  step = 40,
  scrollParentRef, // opcional
}) {
  // Descubrir contenedor scrolleable si no nos lo pasan
  const discoverRef = useRef(null);
  const [parentEl, setParentEl] = useState(null);

  useEffect(() => {
    if (scrollParentRef?.current) {
      setParentEl(scrollParentRef.current);
      return;
    }
    // Buscar ancestro con overflow-y scroll/auto
    let el = discoverRef.current?.parentElement || null;
    const isScrollable = (n) => {
      if (!n) return false;
      const s = window.getComputedStyle(n);
      return /(auto|scroll)/.test(s.overflowY || "") && n.scrollHeight > n.clientHeight;
    };
    while (el && !isScrollable(el)) el = el.parentElement;
    setParentEl(el || null); // null => usaremos window
  }, [scrollParentRef]);

  const isWindowScroll = !parentEl; // si no hay contenedor, virtualizamos contra window

  // Reset sólido al cambiar filtros/búsqueda/buzón
  const keyRef = useRef(resetKey);
  const [visibleCount, setVisibleCount] = useState(Math.min(initialCount, items.length));
  useEffect(() => {
    if (keyRef.current !== resetKey) {
      keyRef.current = resetKey;
      // scroll top
      if (isWindowScroll) {
        window.scrollTo({ top: 0 });
      } else if (parentEl) {
        parentEl.scrollTop = 0;
      }
      setVisibleCount(Math.min(initialCount, items.length));
    }
  }, [resetKey, items.length, isWindowScroll, parentEl, initialCount]);

  // Ajustar si varía el número total
  useEffect(() => {
    setVisibleCount((v) => Math.min(v, items.length));
  }, [items.length]);

  const data = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);

  // Virtualizer (elige hook según el contenedor)
  const baseOptions = {
    count: data.length,
    estimateSize: () => itemSize,
    overscan,
    measureElement: (el) => el?.getBoundingClientRect().height || itemSize,
  };

  const v = isWindowScroll
    ? useWindowVirtualizer(baseOptions)
    : useVirtualizer({
        ...baseOptions,
        getScrollElement: () => parentEl,
      });

  // Carga progresiva al acercarse al final
  useEffect(() => {
    const range = v.getVirtualItems();
    if (!range.length) return;
    const last = range[range.length - 1];
    const nearEnd = last.index >= visibleCount - 6;
    const canGrow = visibleCount < items.length;
    if (nearEnd && canGrow) setVisibleCount((c) => Math.min(c + step, items.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.getVirtualItems(), visibleCount, items.length, step]);

  return (
    <div
      data-virtual-list
      style={{ width: "100%", minHeight: 1 }}
      ref={discoverRef}
    >
      {/* Altura total de la cinta virtual */}
      <div
        style={{
          height: v.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {v.getVirtualItems().map((row) => {
          const item = data[row.index];
          return (
            <div
              key={row.key}
              ref={v.measureElement}
              data-index={row.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${row.start}px)`,
                paddingBottom: "0.5rem", // mantiene el gap vertical
              }}
            >
              {renderItem(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
