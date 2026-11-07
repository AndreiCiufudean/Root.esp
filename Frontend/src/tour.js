// Shared state between a guided page, its scroll view and the tour overlay.
// Screens wrap the parts a tour talks about in <TourTarget id="...">; the overlay scrolls that part to the
// centre of the screen, spotlights it and places the explanation right next to it.
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { View } from 'react-native';

const TourCtx = createContext(null);
export const useTour = () => useContext(TourCtx);

export function TourProvider({ children }) {
  const value = useRef({ targets: {}, scroll: null, listeners: new Set() }).current;
  return <TourCtx.Provider value={value}>{children}</TourCtx.Provider>;
}

export function TourTarget({ id, children, style }) {
  const ctx = useTour();
  const ref = useRef(null);
  useEffect(() => {
    if (!ctx) return undefined;
    ctx.targets[id] = ref;
    return () => { if (ctx.targets[id] === ref) delete ctx.targets[id]; };
  }, [ctx, id]);
  return <View ref={ref} collapsable={false} style={style}>{children}</View>;
}

// Used by <Screen>: lets the overlay scroll the page so the highlighted part is centred.
export function useTourScroll(scrollRef) {
  const ctx = useTour();
  const offset = useRef(0);
  useEffect(() => {
    if (!ctx) return undefined;
    const entry = { ref: scrollRef, offset: () => offset.current };
    ctx.scroll = entry;
    return () => { if (ctx.scroll === entry) ctx.scroll = null; };
  }, [ctx, scrollRef]);
  return (e) => { offset.current = e?.nativeEvent?.contentOffset?.y || 0; };
}

export const measure = (node) => new Promise((resolve) => {
  if (!node || typeof node.measureInWindow !== 'function') return resolve(null);
  try { node.measureInWindow((x, y, w, h) => resolve({ x, y, w, h })); } catch (e) { resolve(null); }
});
