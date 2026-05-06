import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart, formatDkk } from "@/lib/cart";
import { X, ShoppingBag } from "lucide-react";

export function MiniCart() {
  const items = useCart((s) => s.items);
  const isOpen = useCart((s) => s.isOpen);
  const close = useCart((s) => s.closeCart);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const total = useCart((s) => s.total());
  const count = useCart((s) => s.count());
  const { pathname } = useLocation();

  // close on route change
  useEffect(() => { close(); }, [pathname]); // eslint-disable-line

  // esc + lock scroll
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, close]);

  return (
    <>
      <div className={`mini-cart-backdrop ${isOpen ? "is-open" : ""}`} onClick={close} aria-hidden={!isOpen} />
      <aside
        className={`mini-cart ${isOpen ? "is-open" : ""}`}
        role="dialog"
        aria-label="Indkøbskurv"
        aria-hidden={!isOpen}
      >
        <header className="mini-cart-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ShoppingBag size={18} />
            <strong>Din kurv</strong>
            <span style={{ color: "var(--ink-500)", fontSize: 13 }}>({count})</span>
          </div>
          <button onClick={close} className="mini-cart-close" aria-label="Luk">
            <X size={20} />
          </button>
        </header>

        <div className="mini-cart-body">
          {items.length === 0 ? (
            <div className="mini-cart-empty">
              <p>Din kurv er tom.</p>
              <Link to="/webshop" className="btn btn-primary btn-sm" onClick={close}>Se sortimentet</Link>
            </div>
          ) : (
            items.map((i) => (
              <div key={i.productId + (i.variantId ?? "")} className="mini-cart-row">
                <div className="mini-cart-thumb" style={{ background: i.imageGradient || "var(--mist-100)" }}>
                  {i.imageSvg && <div dangerouslySetInnerHTML={{ __html: i.imageSvg }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mini-cart-name">{i.name}</div>
                  {i.variantName && <div className="mini-cart-sub">{i.variantName}</div>}
                  <div className="mini-cart-sub">{formatDkk(i.unitPriceDkk)}</div>
                  <div className="mini-cart-qty">
                    <button onClick={() => setQty(i.productId, i.qty - 1, i.variantId)} aria-label="−">−</button>
                    <span>{i.qty}</span>
                    <button onClick={() => setQty(i.productId, i.qty + 1, i.variantId)} aria-label="+">+</button>
                    <button className="mini-cart-remove" onClick={() => remove(i.productId, i.variantId)}>Fjern</button>
                  </div>
                </div>
                <div className="mini-cart-price">{formatDkk(i.unitPriceDkk * i.qty)}</div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <footer className="mini-cart-foot">
            <div className="mini-cart-totals">
              <span>Subtotal</span>
              <strong>{formatDkk(total)}</strong>
            </div>
            <p className="mini-cart-note">Fragt og afgifter beregnes ved kassen.</p>
            <Link to="/checkout" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={close}>
              Til kassen
            </Link>
            <Link to="/cart" className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={close}>
              Vis kurv
            </Link>
          </footer>
        )}
      </aside>
    </>
  );
}
