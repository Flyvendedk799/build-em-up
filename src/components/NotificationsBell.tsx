import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notifications";

export function NotificationsBell() {
  const { user } = useAuth();
  const { items, load, markAllRead, unreadCount, clear } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) load();
    else clear();
  }, [user]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!user) return null;
  const unread = unreadCount();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => { setOpen(!open); if (!open && unread) markAllRead(); }}
        className="nav-cart"
        aria-label={`Notifikationer${unread ? `, ${unread} ulæste` : ""}`}
      >
        <Bell size={16} />
        {unread > 0 && <span className="nav-cart-badge">{unread}</span>}
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)",
          width: 340, maxHeight: 420, overflowY: "auto",
          background: "var(--paper)", border: "1px solid var(--ink-100)",
          borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
          zIndex: 100,
        }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ink-100)", fontWeight: 600, fontSize: 14 }}>
            Notifikationer
          </div>
          {items.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--ink-500)", fontSize: 13 }}>
              Ingen notifikationer endnu.
            </div>
          ) : (
            <div>
              {items.map((n) => {
                const inner = (
                  <div style={{
                    padding: "12px 18px",
                    borderBottom: "1px solid var(--ink-100)",
                    background: n.read_at ? "transparent" : "rgba(60,120,80,0.05)",
                  }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: "var(--ink-900)" }}>{n.title}</div>
                    {n.body && <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 4 }}>{n.body}</div>}
                    <div style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 6 }}>
                      {new Date(n.created_at).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} to={n.link} onClick={() => setOpen(false)} style={{ textDecoration: "none" }}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
