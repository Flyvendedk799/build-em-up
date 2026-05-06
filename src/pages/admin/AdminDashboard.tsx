import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Link } from "react-router-dom";

type KPI = { revenue: number; orders: number; avg: number; lowStock: number };

export default function AdminDashboard() {
  const [kpi, setKpi] = useState<KPI>({ revenue: 0, orders: 0, avg: 0, lowStock: 0 });
  const [series, setSeries] = useState<{ date: string; total: number }[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; qty: number }[]>([]);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [{ data: orders }, { data: variants }, { data: items }] = await Promise.all([
        supabase.from("orders").select("id, created_at, total_dkk, status").gte("created_at", since).order("created_at", { ascending: false }),
        supabase.from("product_variants").select("id, stock_qty, low_stock_threshold, track_inventory"),
        supabase.from("order_items").select("name, qty"),
      ]);

      const orderList = orders ?? [];
      const revenue = orderList.reduce((s, o: any) => s + (o.total_dkk ?? 0), 0);
      const lowStock = (variants ?? []).filter((v: any) => v.track_inventory && v.stock_qty <= v.low_stock_threshold).length;
      setKpi({
        revenue,
        orders: orderList.length,
        avg: orderList.length ? Math.round(revenue / orderList.length) : 0,
        lowStock,
      });

      const byDay = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        byDay.set(d, 0);
      }
      orderList.forEach((o: any) => {
        const d = o.created_at.slice(0, 10);
        if (byDay.has(d)) byDay.set(d, (byDay.get(d) ?? 0) + (o.total_dkk ?? 0));
      });
      setSeries([...byDay.entries()].map(([date, total]) => ({ date: date.slice(5), total })));
      setRecent(orderList.slice(0, 8));

      const counts = new Map<string, number>();
      (items ?? []).forEach((it: any) => counts.set(it.name, (counts.get(it.name) ?? 0) + (it.qty ?? 0)));
      setTopProducts([...counts.entries()].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5));
    })();
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("da-DK").format(n);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Sidste 30 dage</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Omsætning" value={`${fmt(kpi.revenue)} kr`} />
        <Stat label="Ordrer" value={fmt(kpi.orders)} />
        <Stat label="Gns. ordre" value={`${fmt(kpi.avg)} kr`} />
        <Stat label="Lav lager" value={fmt(kpi.lowStock)} accent={kpi.lowStock > 0} />
      </div>

      <Card>
        <CardHeader><CardTitle>Omsætning pr. dag</CardTitle></CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: any) => `${fmt(v)} kr`} />
              <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Seneste ordrer</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen ordrer endnu.</p>
            ) : (
              <ul className="divide-y">
                {recent.map((o: any) => (
                  <li key={o.id} className="py-2 flex items-center justify-between text-sm">
                    <Link to={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                      #{o.id.slice(0, 8).toUpperCase()}
                    </Link>
                    <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString("da-DK")}</span>
                    <span>{fmt(o.total_dkk)} kr</span>
                    <span className="text-xs px-2 py-0.5 bg-muted rounded">{o.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top 5 produkter</CardTitle></CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen salg endnu.</p>
            ) : (
              <ul className="divide-y">
                {topProducts.map((p) => (
                  <li key={p.name} className="py-2 flex items-center justify-between text-sm">
                    <span>{p.name}</span>
                    <span className="font-medium">{p.qty} stk</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`text-3xl font-semibold mt-1 ${accent ? "text-destructive" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
