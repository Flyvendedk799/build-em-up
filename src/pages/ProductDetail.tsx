import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppNav, SiteFooter } from "@/components/layout/SiteChrome";
import { supabase } from "@/integrations/supabase/client";
import { useCart, formatDkk } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Heart, Minus, Plus } from "lucide-react";

type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  short_description: string | null;
  description: string | null;
  base_price_dkk: number;
  gradient: string | null;
  svg_art: string | null;
  meta: string | null;
  in_stock: boolean;
};

const RV_KEY = "havelandet-recently-viewed";

function pushRecent(slug: string) {
  try {
    const arr: string[] = JSON.parse(localStorage.getItem(RV_KEY) || "[]");
    const next = [slug, ...arr.filter((s) => s !== slug)].slice(0, 6);
    localStorage.setItem(RV_KEY, JSON.stringify(next));
  } catch {}
}

export default function ProductDetail() {
  const { slug } = useParams();
  const [p, setP] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [recent, setRecent] = useState<Product[]>([]);
  const [qty, setQty] = useState(1);
  const cart = useCart();
  const wishlist = useWishlist();
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!slug) return;
    setP(null);
    supabase.from("products").select("*").eq("slug", slug).maybeSingle().then(async ({ data }) => {
      const prod = data as Product | null;
      setP(prod);
      if (prod) {
        document.title = `${prod.name} · Havelandet`;
        pushRecent(prod.slug);
        // related
        const { data: rel } = await supabase
          .from("products")
          .select("*")
          .eq("category", prod.category)
          .neq("id", prod.id)
          .limit(3);
        setRelated((rel as Product[]) || []);
        // recently viewed
        const slugs: string[] = JSON.parse(localStorage.getItem(RV_KEY) || "[]");
        const others = slugs.filter((s) => s !== prod.slug).slice(0, 4);
        if (others.length) {
          const { data: rv } = await supabase.from("products").select("*").in("slug", others);
          setRecent((rv as Product[]) || []);
        } else setRecent([]);
      }
    });
  }, [slug]);

  useEffect(() => { if (user) wishlist.load(); }, [user]); // eslint-disable-line

  if (!p) {
    return (
      <>
        <AppNav active="shop" />
        <div className="container" style={{ padding: "60px 32px" }}>Henter…</div>
        <SiteFooter />
      </>
    );
  }

  const addToCart = () => {
    cart.add({
      productId: p.id,
      name: p.name,
      unitPriceDkk: p.base_price_dkk,
      qty,
      imageGradient: p.gradient || undefined,
      imageSvg: p.svg_art || undefined,
    });
    toast.success(`${p.name} tilføjet`);
  };

  const wished = wishlist.has(p.id);

  return (
    <>
      <AppNav active="shop" />
      <div className="container" style={{ padding: "40px 0" }}>
        <Link to="/webshop" style={{ fontSize: 13, color: "var(--ink-500)" }}>← Webshop</Link>
        <div className="pdp-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, marginTop: 24, alignItems: "start" }}>
          <div className="product-img" style={{ background: p.gradient || "var(--mist-100)", aspectRatio: "1", borderRadius: "var(--r-lg)", position: "relative" }}>
            {p.svg_art && <div dangerouslySetInnerHTML={{ __html: p.svg_art }} />}
            <button
              type="button"
              className={`wish-btn ${wished ? "is-on" : ""}`}
              onClick={async () => {
                if (!user) { toast("Log ind for at gemme favoritter."); return; }
                await wishlist.toggle(p.id);
              }}
              aria-label={wished ? "Fjern fra favoritter" : "Gem som favorit"}
              style={{ top: 16, right: 16 }}
            >
              <Heart size={18} fill={wished ? "currentColor" : "none"} />
            </button>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>{p.category}</div>
            <h1 style={{ fontSize: 48, marginBottom: 8 }}>
              {p.name}
              {!p.in_stock && <span className="stock-pill out" style={{ verticalAlign: "middle" }}>Udsolgt</span>}
            </h1>
            <p style={{ color: "var(--ink-500)", marginBottom: 24 }}>{p.meta}</p>
            <p style={{ fontSize: 17, lineHeight: 1.6, marginBottom: 32 }}>{p.description || p.short_description}</p>
            <div style={{ fontSize: 32, fontFamily: "var(--serif)", marginBottom: 24 }}>{formatDkk(p.base_price_dkk)}</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div className="mini-cart-qty" style={{ marginTop: 0 }}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Færre"><Minus size={14} /></button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} aria-label="Flere"><Plus size={14} /></button>
              </div>
              <button className="btn btn-primary" onClick={addToCart} disabled={!p.in_stock}>
                Læg i kurv
              </button>
              <button
                className="btn btn-gold"
                disabled={!p.in_stock}
                onClick={() => { addToCart(); nav("/checkout"); }}
              >
                Køb nu
              </button>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <Section title="Relaterede produkter" items={related} />
        )}
        {recent.length > 0 && (
          <Section title="Set for nylig" items={recent} />
        )}
      </div>

      {/* Sticky mobile CTA */}
      <div className="pdp-sticky">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "var(--ink-500)" }}>{p.name}</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 20 }}>{formatDkk(p.base_price_dkk)}</div>
        </div>
        <button className="btn btn-primary" onClick={addToCart} disabled={!p.in_stock}>Læg i kurv</button>
      </div>

      <SiteFooter />
    </>
  );
}

function Section({ title, items }: { title: string; items: Product[] }) {
  return (
    <section style={{ marginTop: 80 }}>
      <h2 style={{ fontSize: 28, marginBottom: 24 }}>{title}</h2>
      <div className="shop-grid">
        {items.map((p) => (
          <Link key={p.id} to={`/webshop/${p.slug}`} className="product" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="product-img" style={{ background: p.gradient || "var(--mist-100)" }}>
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
