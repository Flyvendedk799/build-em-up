import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Heart, Share2, Minus, Plus } from "lucide-react";
import { formatDkk } from "@/lib/cart";

type Props = {
  name: string;
  category: string;
  meta: string | null;
  short: string | null;
  price: number;
  inStock: boolean;
  gradient: string | null;
  svg: string | null;
  qty: number;
  setQty: (q: number) => void;
  onAdd: () => void;
  onBuy: () => void;
  onWish: () => void;
  wished: boolean;
};

export function HeroStage({
  name, category, meta, short, price, inStock, gradient, svg,
  qty, setQty, onAdd, onBuy, onWish, wished,
}: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      setGlow({
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top) / r.height) * 100,
      });
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [reduced]);

  return (
    <section className="pdp-hero">
      <div className="pdp-hero-bg" style={{ background: gradient || "var(--mist-100)" }} />
      <div className="container pdp-hero-grid">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="pdp-hero-copy"
        >
          <div className="eyebrow">{category}</div>
          <h1 className="pdp-hero-title">
            {name}
            {!inStock && <span className="stock-pill out">Udsolgt</span>}
          </h1>
          {meta && <p className="pdp-hero-meta">{meta}</p>}
          {short && <p className="pdp-hero-short">{short}</p>}
          <div className="pdp-hero-price">{formatDkk(price)}</div>
          <div className="pdp-hero-cta">
            <div className="mini-cart-qty" style={{ marginTop: 0 }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Færre"><Minus size={14} /></button>
              <span>{qty}</span>
              <button onClick={() => setQty(qty + 1)} aria-label="Flere"><Plus size={14} /></button>
            </div>
            <button className="btn btn-primary" onClick={onAdd} disabled={!inStock}>Læg i kurv</button>
            <button className="btn btn-gold" onClick={onBuy} disabled={!inStock}>Køb nu</button>
            <button
              className={`wish-btn ${wished ? "is-on" : ""}`}
              onClick={onWish}
              aria-label={wished ? "Fjern favorit" : "Gem favorit"}
              style={{ position: "static" }}
            >
              <Heart size={18} fill={wished ? "currentColor" : "none"} />
            </button>
            <button
              className="wish-btn"
              aria-label="Del"
              style={{ position: "static" }}
              onClick={() => {
                if (navigator.share) navigator.share({ title: name, url: location.href }).catch(() => {});
                else navigator.clipboard.writeText(location.href);
              }}
            >
              <Share2 size={18} />
            </button>
          </div>
        </motion.div>

        <div ref={ref} className="pdp-hero-stage">
          <motion.div
            className="pdp-hero-canvas"
            style={{ background: gradient || "var(--mist-100)" }}
            initial={reduced ? false : { scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="pdp-hero-glow"
              style={{ background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(255,255,255,0.45), transparent 55%)` }}
            />
            {svg && (
              <motion.div
                className="pdp-hero-art"
                animate={reduced ? {} : { y: [0, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            )}
          </motion.div>
          <div className="pdp-hero-shadow" />
        </div>
      </div>
    </section>
  );
}
