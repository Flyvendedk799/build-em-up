import { useMemo } from "react";
import { Download, TrendingDown, Droplets, CloudRain, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

type EventRow = {
  id: string; zone_id: string | null; scheduled_for: string;
  ran_at: string | null; weather_skipped: boolean; reason: string | null; mm_delivered: number | null;
};
type Zone = { id: string; name: string; area_m2: number | null };

const PRICE_PER_M3_DKK = 70; // approx Danish water+sewage cost

export default function InsightsTab({
  events, zones,
}: { events: EventRow[]; zones: Zone[] }) {
  const stats = useMemo(() => {
    const now = Date.now();
    const dayMs = 86400e3;
    const buckets = { d7: 0, d30: 0, d365: 0, skipped: 0, totalEvents: 0 };
    const byZone: Record<string, number> = {};
    for (const e of events) {
      const t = new Date(e.scheduled_for).getTime();
      const age = (now - t) / dayMs;
      const area = zones.find(z => z.id === e.zone_id)?.area_m2 ?? 0;
      const liters = (e.mm_delivered ?? 0) * Number(area);
      if (e.weather_skipped) {
        buckets.skipped += 5 * Number(area); // assume 5mm saved per skip
      } else if (e.ran_at) {
        buckets.totalEvents++;
        if (age <= 7) buckets.d7 += liters;
        if (age <= 30) buckets.d30 += liters;
        if (age <= 365) buckets.d365 += liters;
        if (e.zone_id) byZone[e.zone_id] = (byZone[e.zone_id] || 0) + liters;
      }
    }
    const top = Object.entries(byZone)
      .map(([id, l]) => ({ id, name: zones.find(z => z.id === id)?.name ?? "Zone", liters: l }))
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 5);
    const cost = (buckets.d365 / 1000) * PRICE_PER_M3_DKK;
    return { ...buckets, top, cost };
  }, [events, zones]);

  const maxTop = Math.max(1, ...stats.top.map(t => t.liters));

  function exportCSV() {
    const rows = [["dato", "zone", "status", "mm", "begrundelse"]];
    for (const e of events) {
      rows.push([
        e.scheduled_for,
        zones.find(z => z.id === e.zone_id)?.name ?? "",
        e.weather_skipped ? "sprunget" : (e.ran_at ? "vandet" : "planlagt"),
        String(e.mm_delivered ?? ""),
        e.reason ?? "",
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "vandinger.csv"; a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div style={{ display: "grid", gap: 18, marginBottom: 40 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Card icon={<Droplets size={18} />} label="7 dage" value={`${Math.round(stats.d7)} L`} />
        <Card icon={<Droplets size={18} />} label="30 dage" value={`${Math.round(stats.d30)} L`} />
        <Card icon={<CloudRain size={18} />} label="Sparet i alt" value={`${Math.round(stats.skipped)} L`} accent />
        <Card icon={<Coins size={18} />} label="Vandregning (12 mdr)" value={`${Math.round(stats.cost)} kr`} />
      </div>

      <section className="water-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16 }}>Mest vandintensive bede (12 mdr)</h3>
          <Button variant="ghost" size="sm" onClick={exportCSV} disabled={events.length === 0}>
            <Download size={14} className="mr-1.5" />Eksportér CSV
          </Button>
        </div>
        {stats.top.length === 0 ? (
          <p style={{ color: "var(--ink-500)", fontSize: 13 }}>Endnu ingen vandinger registreret.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {stats.top.map(t => (
              <div key={t.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>{t.name}</span>
                  <span style={{ color: "var(--ink-500)" }}>{Math.round(t.liters)} L</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: "rgba(20,39,29,0.08)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(t.liters / maxTop) * 100}%`, background: "linear-gradient(90deg, var(--forest-800), #4a8466)" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="water-card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <TrendingDown size={28} style={{ color: "var(--forest-800)" }} />
        <div>
          <div style={{ fontWeight: 600 }}>{stats.totalEvents} vandinger registreret</div>
          <div style={{ fontSize: 13, color: "var(--ink-500)" }}>
            ~{Math.round(stats.skipped / 1000 * PRICE_PER_M3_DKK)} kr sparet pga. regn-skip.
          </div>
        </div>
      </section>
    </div>
  );
}

function Card({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="water-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", color: accent ? "var(--forest-800)" : "var(--ink-500)", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
}
