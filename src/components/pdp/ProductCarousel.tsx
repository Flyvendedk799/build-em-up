import { Link } from "react-router-dom";
import { formatDkk } from "@/lib/cart";

type Item = {
  id: string;
  slug: string;
  name: string;
  meta: string | null;
  base_price_dkk: number;
  gradient: string | null;
  svg_art: string | null;
};

export function ProductCarousel({ title, items }: { title: string; items: Item[] }) {
  if (!items.length) return null;
  return (
    <section className="pdp-carousel">
      <h2>{title}</h2>
      <div className="pdp-carousel-track">
        {items.map((p) => (
          <Link key={p.id} to={`/webshop/${p.slug}`} className="pdp-carousel-card">
            <div className="thumb" style={{ background: p.gradient || "var(--mist-100)" }}>
              {p.svg_art && <div dangerouslySetInnerHTML={{ __html: p.svg_art }} />}
            </div>
            <div className="name">{p.name}</div>
            <div className="meta">{p.meta}</div>
            <div className="price">{formatDkk(p.base_price_dkk)}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
