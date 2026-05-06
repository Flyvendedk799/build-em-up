import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppNav, SiteFooter } from "@/components/layout/SiteChrome";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type Counts = { products: number; orders: number; users: number; plants: number };
type Order = { id: string; created_at: string; total_dkk: number; status: string; user_id: string };

export default function Admin() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [counts, setCounts] = useState<Counts>({ products: 0, orders: 0, users: 0, plants: 0 });
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav("/login?next=/admin"); return; }
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
    })();
  }, [user, loading]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [{ count: pc }, { count: oc }, { count: plc }, { data: o }] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("plants_catalog").select("slug", { count: "exact", head: true }),
        supabase.from("orders").select("id, created_at, total_dkk, status, user_id").order("created_at", { ascending: false }).limit(20),
      ]);
      setCounts({ products: pc ?? 0, orders: oc ?? 0, users: 0, plants: plc ?? 0 });
      setOrders((o ?? []) as Order[]);
    })();
  }, [isAdmin]);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success("Opdateret");
  }

  if (loading || isAdmin === null) return null;

  if (!isAdmin) {
    return (
      <>
        <AppNav />
        <div className="container">
          <header className="page-head">
            <div className="eyebrow">Admin</div>
            <h1>Adgang nægtet</h1>
            <p className="lede">Du har ikke admin-rettigheder.</p>
          </header>
        </div>
        <SiteFooter />
      </>
    );
  }

  const fmt = (n: number) => new Intl.NumberFormat("da-DK").format(n);

  return (
    <>
      <AppNav />
      <div className="container" style={{ paddingBottom: 60 }}>
        <header className="page-head">
          <div className="eyebrow">Admin</div>
          <h1>Drift af Havelandet</h1>
          <p className="lede">Produkter, ordrer og indhold.</p>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
          <Stat label="Produkter" value={fmt(counts.products)} />
          <Stat label="Ordrer" value={fmt(counts.orders)} />
          <Stat label="Plante-katalog" value={fmt(counts.plants)} />
        </div>

        <section style={{
          background: "var(--paper)", border: "1px solid var(--ink-100)",
          borderRadius: 20, padding: 24,
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Seneste ordrer</h3>
          {orders.length === 0 ? (
            <p style={{ color: "var(--ink-500)" }}>Ingen ordrer endnu.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {orders.map((o) => (
                <div key={o.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                  background: "var(--ink-50)", borderRadius: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>#{o.id.slice(0, 8).toUpperCase()}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-500)" }}>
                      {new Date(o.created_at).toLocaleString("da-DK")} · {fmt(o.total_dkk)} kr
                    </div>
                  </div>
                  <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ink-100)", fontSize: 13 }}>
                    <option value="pending">Afventer</option>
                    <option value="paid">Betalt</option>
                    <option value="shipped">Sendt</option>
                    <option value="delivered">Leveret</option>
                    <option value="cancelled">Annulleret</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <SiteFooter />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: "var(--paper)", border: "1px solid var(--ink-100)",
      borderRadius: 16, padding: "20px 22px",
    }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--ink-500)" }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 600, color: "var(--forest-800)", marginTop: 4 }}>{value}</div>
    </div>
  );
}
