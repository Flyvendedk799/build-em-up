import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const items = [
  {
    to: "/",
    key: "home",
    label: "Hjem",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    to: "/webshop",
    key: "shop",
    label: "Shop",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16l-1.5 12a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 7z" />
        <path d="M8 7V5a4 4 0 0 1 8 0v2" />
      </svg>
    ),
  },
  {
    to: "/havemaaler",
    key: "sizer",
    label: "Måler",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3z" />
        <path d="M9 4v13M15 7v13" />
      </svg>
    ),
  },
  {
    to: "/vanding",
    key: "water",
    label: "Vanding",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z" />
      </svg>
    ),
  },
  {
    to: "/ai",
    key: "ai",
    label: "AI",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      </svg>
    ),
  },
  {
    to: "/konto",
    key: "account",
    label: "Konto",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
];

export function MobileTabBar() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const [visible, setVisible] = useState(!isHome);

  useEffect(() => {
    if (!isHome) {
      setVisible(true);
      return;
    }
    // On home, only show once user has scrolled past the 3D stage sequence.
    setVisible(false);
    const onScroll = () => {
      const stage = document.querySelector<HTMLElement>(".stage");
      if (!stage) {
        setVisible(window.scrollY > window.innerHeight * 0.8);
        return;
      }
      const rect = stage.getBoundingClientRect();
      // Stage finished when its bottom has scrolled above the viewport bottom.
      setVisible(rect.bottom <= window.innerHeight + 4);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome, pathname]);

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");

  return (
    <nav
      className={`mobile-tabbar ${visible ? "is-visible" : ""}`}
      aria-label="Hovednavigation"
      aria-hidden={!visible}
    >
      {items.map((it) => (
        <Link
          key={it.key}
          to={it.to}
          className={`mtb-item ${isActive(it.to) ? "is-active" : ""}`}
          aria-label={it.label}
        >
          <span className="mtb-icon">{it.icon}</span>
          <span className="mtb-label">{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}
