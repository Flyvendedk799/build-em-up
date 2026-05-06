import { useEffect, useRef, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";

/**
 * Wraps Routes so each pathname change fades the content briefly.
 * Honors prefers-reduced-motion. No layout shift — only opacity.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(true);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    setVisible(false);
    const id = window.setTimeout(() => setVisible(true), 60);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 220ms ease",
        willChange: "opacity",
      }}
    >
      {children}
    </div>
  );
}
