import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { formatDkk } from "@/lib/cart";

type Props = {
  name: string;
  price: number;
  qty: number;
  setQty: (q: number) => void;
  onAdd: () => void;
  onBuy: () => void;
  inStock: boolean;
};

export function StickyBuyBar({ name, price, qty, setQty, onAdd, onBuy, inStock }: Props) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`pdp-buybar ${show ? "is-visible" : ""}`} role="region" aria-label="Køb">
      <div className="container pdp-buybar-inner">
        <div className="pdp-buybar-info">
          <div className="name">{name}</div>
          <div className="price">{formatDkk(price)}</div>
        </div>
        <div className="pdp-buybar-actions">
          <div className="mini-cart-qty" style={{ marginTop: 0 }}>
            <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Færre"><Minus size={14} /></button>
            <span>{qty}</span>
            <button onClick={() => setQty(qty + 1)} aria-label="Flere"><Plus size={14} /></button>
          </div>
          <button className="btn btn-primary" onClick={onAdd} disabled={!inStock}>Læg i kurv</button>
          <button className="btn btn-gold pdp-buybar-buy" onClick={onBuy} disabled={!inStock}>Køb nu</button>
        </div>
      </div>
    </div>
  );
}
