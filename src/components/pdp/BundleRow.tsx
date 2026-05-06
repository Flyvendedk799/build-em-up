import { useCart, formatDkk } from "@/lib/cart";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type Item = {
  id: string;
  name: string;
  base_price_dkk: number;
  gradient: string | null;
  svg_art: string | null;
};

export function BundleRow({ items }: { items: Item[] }) {
  const cart = useCart();
  if (items.length < 2) return null;
  const subtotal = items.reduce((s, i) => s + i.base_price_dkk, 0);
  const discounted = Math.round(subtotal * 0.9);

  const addAll = () => {
    items.forEach((i) =>
      cart.add({
        productId: i.id,
        name: i.name,
        unitPriceDkk: Math.round(i.base_price_dkk * 0.9),
        qty: 1,
        imageGradient: i.gradient || undefined,
        imageSvg: i.svg_art || undefined,
      })
    );
    track("bundle_add", { count: items.length, subtotal, discounted });
    toast.success("Pakke tilføjet med 10% rabat");
  };

  return (
    <section className="pdp-bundle">
      <div className="eyebrow">Komplet din have</div>
      <h2>Spar 10% når du tager pakken</h2>
      <div className="pdp-bundle-row">
        {items.map((i, idx) => (
          <div key={i.id} className="pdp-bundle-item">
            <div className="thumb" style={{ background: i.gradient || "var(--mist-100)" }}>
              {i.svg_art && <div dangerouslySetInnerHTML={{ __html: i.svg_art }} />}
            </div>
            <div className="lbl">{i.name}</div>
            <div className="prc">{formatDkk(i.base_price_dkk)}</div>
            {idx < items.length - 1 && <Plus className="bundle-plus" size={20} />}
          </div>
        ))}
        <div className="pdp-bundle-cta">
          <div className="was">{formatDkk(subtotal)}</div>
          <div className="now">{formatDkk(discounted)}</div>
          <button className="btn btn-primary" onClick={addAll}>Tilføj pakke</button>
        </div>
      </div>
    </section>
  );
}
