import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppNav, SiteFooter } from "@/components/layout/SiteChrome";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2 } from "lucide-react";

type Order = { id: string; created_at: string; total_dkk: number; status: string; shipping_address: any };
type Item = { id: string; name: string; qty: number; unit_price_dkk: number };

export default function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!id) return;
    supabase.from("orders").select("*").eq("id", id).maybeSingle().then(({ data }) => setOrder(data as Order | null));
    supabase.from("order_items").select("id, name, qty, unit_price_dkk").eq("order_id", id).then(({ data }) => setItems((data as Item[]) || []));
  }, [id]);

  const fmt = (n: number) => new Intl.NumberFormat("da-DK").format(n) + " kr";

  return (
    <>
      <AppNav active="shop" />
      <div className="container" style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <CheckCircle2 size={56} color="var(--forest-700)" style={{ marginBottom: 16 }} />
          <h1 style={{ fontSize: 36, marginBottom: 8 }}>Tak for din ordre!</h1>
          <p style={{ color: "var(--ink-500)" }}>
            En bekræftelse er sendt{order?.shipping_address?.email ? ` til ${order.shipping_address.email}` : ""}.
          </p>
        </div>

        {order && (
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(20,39,29,0.08)" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: 0.6 }}>Ordrenr.</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 18 }}>#{order.id.slice(0, 8).toUpperCase()}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: 0.6 }}>Total</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22 }}>{fmt(order.total_dkk)}</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {items.map((i) => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span>{i.qty} × {i.name}</span>
                  <span>{fmt(i.unit_price_dkk * i.qty)}</span>
                </div>
              ))}
            </div>

            {order.shipping_address && (
              <div style={{ paddingTop: 16, borderTop: "1px solid rgba(20,39,29,0.08)", fontSize: 14, color: "var(--ink-700)" }}>
                <div style={{ fontSize: 12, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Leveres til</div>
                <div>{order.shipping_address.name}</div>
                <div>{order.shipping_address.address}</div>
                <div>{order.shipping_address.postal_code} {order.shipping_address.city}</div>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link to="/webshop" className="btn btn-ghost btn-sm" style={{ marginRight: 12 }}>Fortsæt med at handle</Link>
          <Link to="/konto" className="btn btn-primary btn-sm">Se mine ordrer</Link>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
