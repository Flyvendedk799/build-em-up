import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppNav, SiteFooter } from "@/components/layout/SiteChrome";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCart, formatDkk } from "@/lib/cart";
import { toast } from "sonner";

type Address = { name: string; address: string; postal_code: string; city: string; email: string };

export default function Checkout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total());
  const clear = useCart((s) => s.clear);
  const [addr, setAddr] = useState<Address>({ name: "", address: "", postal_code: "", city: "", email: "" });
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">("standard");
  const [submitting, setSubmitting] = useState(false);

  const shipping = total === 0 ? 0 : shippingMethod === "express" ? 99 : total > 499 ? 0 : 49;
  const grand = total + shipping;

  useEffect(() => {
    if (!loading && !user) nav("/login?next=/checkout");
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name, address, postal_code")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAddr((a) => ({
            ...a,
            name: data.name ?? a.name,
            address: data.address ?? a.address,
            postal_code: data.postal_code ?? a.postal_code,
            email: user.email ?? a.email,
          }));
        } else if (user.email) {
          setAddr((a) => ({ ...a, email: user.email! }));
        }
      });
  }, [user]);

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!user || items.length === 0) return;
    if (!addr.name || !addr.address || !addr.postal_code || !addr.city) {
      toast.error("Udfyld leveringsadressen.");
      return;
    }
    setSubmitting(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        total_dkk: grand,
        status: "confirmed",
        shipping_address: { ...addr, shipping_method: shippingMethod },
      })
      .select()
      .single();
    if (error || !order) {
      setSubmitting(false);
      toast.error(error?.message || "Kunne ikke oprette ordre.");
      return;
    }
    const rows = items.map((i) => ({
      order_id: order.id,
      user_id: user.id,
      product_id: i.productId,
      variant_id: i.variantId ?? null,
      name: i.name + (i.variantName ? ` — ${i.variantName}` : ""),
      qty: i.qty,
      unit_price_dkk: i.unitPriceDkk,
    }));
    await supabase.from("order_items").insert(rows);
    clear();
    nav(`/order/${order.id}`);
  }

  if (loading || !user) return null;

  if (items.length === 0) {
    return (
      <>
        <AppNav active="shop" />
        <div className="container" style={{ padding: "80px 0", textAlign: "center" }}>
          <h1 style={{ marginBottom: 16 }}>Din kurv er tom</h1>
          <Link to="/webshop" className="btn btn-primary">Se sortimentet</Link>
        </div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <AppNav active="shop" />
      <div className="container">
        <header className="page-head">
          <div className="eyebrow" style={{ marginBottom: 14 }}>Kassen</div>
          <h1>Færdiggør din ordre.</h1>
        </header>

        <form onSubmit={placeOrder} className="checkout-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <section className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 20, marginBottom: 18 }}>Leveringsadresse</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Navn" value={addr.name} onChange={(v) => setAddr({ ...addr, name: v })} required />
                <Field label="E-mail" type="email" value={addr.email} onChange={(v) => setAddr({ ...addr, email: v })} required />
                <Field label="Adresse" value={addr.address} onChange={(v) => setAddr({ ...addr, address: v })} required full />
                <Field label="Postnummer" value={addr.postal_code} onChange={(v) => setAddr({ ...addr, postal_code: v })} required />
                <Field label="By" value={addr.city} onChange={(v) => setAddr({ ...addr, city: v })} required />
              </div>
            </section>

            <section className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 20, marginBottom: 18 }}>Levering</h3>
              <label className="ship-opt">
                <input type="radio" name="ship" checked={shippingMethod === "standard"} onChange={() => setShippingMethod("standard")} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>Standard (2–4 hverdage)</div>
                  <div style={{ fontSize: 13, color: "var(--ink-500)" }}>Gratis fra 499 kr</div>
                </div>
                <div>{total > 499 ? "Gratis" : "49 kr"}</div>
              </label>
              <label className="ship-opt">
                <input type="radio" name="ship" checked={shippingMethod === "express"} onChange={() => setShippingMethod("express")} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>Ekspres (1–2 hverdage)</div>
                  <div style={{ fontSize: 13, color: "var(--ink-500)" }}>Leveres med GLS</div>
                </div>
                <div>99 kr</div>
              </label>
            </section>
          </div>

          <aside className="card checkout-summary" style={{ padding: 24, height: "fit-content", position: "sticky", top: 96 }}>
            <h3 style={{ fontSize: 20, marginBottom: 18 }}>Opsummering</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {items.map((i) => (
                <div key={i.productId + (i.variantId ?? "")} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "var(--ink-700)" }}>{i.qty} × {i.name}</span>
                  <span>{formatDkk(i.unitPriceDkk * i.qty)}</span>
                </div>
              ))}
            </div>
            <Row label="Subtotal" value={formatDkk(total)} />
            <Row label="Fragt" value={shipping === 0 ? "Gratis" : formatDkk(shipping)} />
            <div style={{ borderTop: "1px solid rgba(20,39,29,0.1)", marginTop: 14, paddingTop: 14 }}>
              <Row label={<strong>Total</strong>} value={<strong style={{ fontFamily: "var(--serif)", fontSize: 22 }}>{formatDkk(grand)}</strong>} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 24, height: 48, justifyContent: "center" }} disabled={submitting}>
              {submitting ? "Behandler…" : "Bekræft ordre"}
            </button>
            <p style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 12, textAlign: "center" }}>
              Betaling tilføjes snart. Du modtager en bekræftelse med det samme.
            </p>
          </aside>
        </form>
      </div>
      <SiteFooter />
    </>
  );
}

function Field({ label, value, onChange, type = "text", required, full }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; full?: boolean }) {
  return (
    <div className="field" style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14 }}>
      <span style={{ color: "var(--ink-500)" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
