import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppNav, SiteFooter } from "@/components/layout/SiteChrome";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useActiveGarden } from "@/lib/activeGarden";
import { toast } from "sonner";

type Garden = { id: string; name: string; latitude: number | null; longitude: number | null };
type Zone = { id: string; garden_id: string; name: string; type: string; area_m2: number | null };
type Schedule = {
  id: string;
  zone_id: string;
  name: string;
  weekday_mask: number;
  start_time: string;
  duration_min: number;
  enabled: boolean;
  ai_adjusted: boolean;
};
type Event = {
  id: string;
  zone_id: string | null;
  scheduled_for: string;
  ran_at: string | null;
  weather_skipped: boolean;
  reason: string | null;
  mm_delivered: number | null;
};

const DAYS = ["M", "T", "O", "T", "F", "L", "S"]; // Mon..Sun, bit 0 = Mon

function maskHas(mask: number, day: number) {
  return (mask & (1 << day)) !== 0;
}
function maskToggle(mask: number, day: number) {
  return mask ^ (1 << day);
}

function nextOccurrence(s: Schedule): Date {
  const now = new Date();
  const [h, m] = s.start_time.split(":").map(Number);
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(h, m, 0, 0);
    // JS: 0=Sun..6=Sat. We treat bit 0 = Mon.
    const jsDow = d.getDay();
    const dow = (jsDow + 6) % 7;
    if (maskHas(s.weekday_mask, dow) && d.getTime() > now.getTime()) {
      return d;
    }
  }
  return new Date(now.getTime() + 7 * 86400000);
}

export default function WateringPlan() {
  const { user, loading: authLoading } = useAuth();
  const { activeGardenId, setActive } = useActiveGarden();
  const [loading, setLoading] = useState(true);
  const [allGardens, setAllGardens] = useState<Garden[]>([]);
  const [garden, setGarden] = useState<Garden | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [forecast, setForecast] = useState<{ date: string; mm: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: gs } = await supabase
        .from("gardens")
        .select("id,name,latitude,longitude")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      const list = (gs ?? []) as Garden[];
      setAllGardens(list);
      const g = list.find((x) => x.id === activeGardenId) ?? list[0] ?? null;
      setGarden(g);
      if (g && !activeGardenId) setActive(g.id);

      if (g) {
        const { data: zs } = await supabase
          .from("garden_zones")
          .select("id,garden_id,name,type,area_m2")
          .eq("garden_id", g.id);
        setZones(zs ?? []);
      } else {
        setZones([]);
      }

      const { data: ss } = await supabase
        .from("watering_schedules")
        .select("*")
        .eq("user_id", user.id);
      setSchedules(ss ?? []);

      const { data: es } = await supabase
        .from("watering_events")
        .select("*")
        .eq("user_id", user.id)
        .order("scheduled_for", { ascending: false })
        .limit(20);
      setEvents(es ?? []);

      setLoading(false);
    })();
  }, [user, activeGardenId]);

  // Fetch weather forecast (Open-Meteo, no key needed)
  useEffect(() => {
    if (!garden?.latitude || !garden?.longitude) return;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${garden.latitude}&longitude=${garden.longitude}&daily=precipitation_sum&timezone=Europe%2FCopenhagen&forecast_days=7`;
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        const dates: string[] = j?.daily?.time ?? [];
        const mm: number[] = j?.daily?.precipitation_sum ?? [];
        setForecast(dates.map((d, i) => ({ date: d, mm: mm[i] ?? 0 })));
      })
      .catch(() => setForecast([]));
  }, [garden?.latitude, garden?.longitude]);

  const rainByDate = useMemo(() => {
    const m = new Map<string, number>();
    forecast.forEach((f) => m.set(f.date, f.mm));
    return m;
  }, [forecast]);

  function rainForDate(d: Date): number {
    const key = d.toISOString().slice(0, 10);
    return rainByDate.get(key) ?? 0;
  }

  async function addSchedule(zoneId: string) {
    if (!user) return;
    const { data, error } = await supabase
      .from("watering_schedules")
      .insert({
        user_id: user.id,
        zone_id: zoneId,
        name: "Vanding",
        weekday_mask: 127,
        start_time: "06:30:00",
        duration_min: 15,
        enabled: true,
        ai_adjusted: true,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setSchedules((prev) => [...prev, data as Schedule]);
  }

  async function updateSchedule(id: string, patch: Partial<Schedule>) {
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const { error } = await supabase.from("watering_schedules").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  }

  async function deleteSchedule(id: string) {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("watering_schedules").delete().eq("id", id);
  }

  async function waterNow(zone: Zone, sched?: Schedule) {
    if (!user) return;
    const { data, error } = await supabase
      .from("watering_events")
      .insert({
        user_id: user.id,
        zone_id: zone.id,
        schedule_id: sched?.id ?? null,
        scheduled_for: new Date().toISOString(),
        ran_at: new Date().toISOString(),
        weather_skipped: false,
        reason: "Manuel",
        mm_delivered: 5,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setEvents((prev) => [data as Event, ...prev]);
    toast.success(`Vander ${zone.name} nu`);
  }

  if (authLoading) return null;

  if (!user) {
    return (
      <>
        <AppNav active="water" />
        <div className="container">
          <header className="page-head">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Vandingsplan</div>
            <h1>Log ind for at se din vandingsplan.</h1>
            <p className="lede">Vandingsplanen er knyttet til din have og dine zoner.</p>
            <div style={{ marginTop: 24 }}>
              <Link to="/login" className="btn btn-primary">Log ind</Link>
            </div>
          </header>
        </div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <AppNav active="water" />
      <div className="container">
        <header className="page-head">
          <div className="eyebrow" style={{ marginBottom: 14 }}>Vandingsplan</div>
          <h1>Vanding der følger vejret.</h1>
          <p className="lede">
            Lav timere for hvert bed. Hvis Open-Meteo melder regn over 3 mm på dagen, springer AI'en vandingen over.
          </p>
        </header>

        {allGardens.length > 1 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--ink-500)", marginRight: 4 }}>Aktiv have:</span>
            {allGardens.map((g) => (
              <button
                key={g.id}
                onClick={() => setActive(g.id)}
                className={g.id === activeGardenId ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
              >{g.name}</button>
            ))}
          </div>
        )}

        {garden && forecast.length > 0 && (
          <div style={{ ...card(), padding: 16 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--ink-500)", marginBottom: 10 }}>
              7-dages vejr · {garden.name}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
              {forecast.slice(0, 7).map((f) => {
                const d = new Date(f.date);
                const wet = f.mm > 3;
                return (
                  <div key={f.date} style={{
                    textAlign: "center",
                    padding: "10px 4px",
                    borderRadius: 10,
                    background: wet ? "rgba(60,120,200,0.12)" : "var(--ink-50)",
                    border: wet ? "1px solid rgba(60,120,200,0.3)" : "1px solid transparent",
                  }}>
                    <div style={{ fontSize: 11, color: "var(--ink-500)" }}>{d.toLocaleDateString("da-DK", { weekday: "short" })}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4, color: wet ? "#2d5a8a" : "var(--ink-900)" }}>{f.mm.toFixed(1)}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-500)" }}>mm</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!garden && (
          <div style={card()}>
            <p style={{ marginBottom: 14 }}>Du har ingen have endnu. Start med at måle den op.</p>
            <Link to="/havemaaler" className="btn btn-primary">Mål min have</Link>
          </div>
        )}

        {garden && zones.length === 0 && (
          <div style={card()}>
            <p style={{ marginBottom: 14 }}>Du har ingen zoner i <strong>{garden.name}</strong>. Tilføj zoner i Havemåleren.</p>
            <Link to="/havemaaler" className="btn btn-primary">Tilføj zoner</Link>
          </div>
        )}

        {garden && zones.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, marginBottom: 40 }}>
              {zones.map((z) => {
                const zSchedules = schedules.filter((s) => s.zone_id === z.id);
                return (
                  <div key={z.id} style={card()}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16, gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <h2 style={{ fontSize: 22, marginBottom: 4 }}>{z.name}</h2>
                        <div style={{ color: "var(--ink-500)", fontSize: 13 }}>
                          {z.type} {z.area_m2 ? `· ${Math.round(Number(z.area_m2))} m²` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => waterNow(z, zSchedules[0])}>Vand nu</button>
                        <button className="btn btn-primary btn-sm" onClick={() => addSchedule(z.id)}>+ Ny timer</button>
                      </div>
                    </div>

                    {zSchedules.length === 0 && (
                      <p style={{ color: "var(--ink-500)", fontSize: 14 }}>Ingen timere endnu.</p>
                    )}

                    <div style={{ display: "grid", gap: 12 }}>
                      {zSchedules.map((s) => {
                        const next = nextOccurrence(s);
                        const rain = rainForDate(next);
                        const skipped = s.ai_adjusted && rain > 3;
                        return (
                          <div key={s.id} style={schedRow()}>
                            <input
                              type="text"
                              value={s.name}
                              onChange={(e) => updateSchedule(s.id, { name: e.target.value })}
                              style={input()}
                            />
                            <div style={{ display: "flex", gap: 4 }}>
                              {DAYS.map((d, i) => (
                                <button
                                  key={i}
                                  onClick={() => updateSchedule(s.id, { weekday_mask: maskToggle(s.weekday_mask, i) })}
                                  style={dayChip(maskHas(s.weekday_mask, i))}
                                  type="button"
                                  aria-pressed={maskHas(s.weekday_mask, i)}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                            <input
                              type="time"
                              value={s.start_time.slice(0, 5)}
                              onChange={(e) => updateSchedule(s.id, { start_time: `${e.target.value}:00` })}
                              style={input(110)}
                            />
                            <input
                              type="number"
                              min={1}
                              max={120}
                              value={s.duration_min}
                              onChange={(e) => updateSchedule(s.id, { duration_min: Number(e.target.value) })}
                              style={input(80)}
                            />
                            <span style={{ fontSize: 12, color: "var(--ink-500)" }}>min</span>
                            <label style={toggle()}>
                              <input
                                type="checkbox"
                                checked={s.ai_adjusted}
                                onChange={(e) => updateSchedule(s.id, { ai_adjusted: e.target.checked })}
                              />
                              AI justerer
                            </label>
                            <label style={toggle()}>
                              <input
                                type="checkbox"
                                checked={s.enabled}
                                onChange={(e) => updateSchedule(s.id, { enabled: e.target.checked })}
                              />
                              Aktiv
                            </label>
                            <div style={{ flex: 1, minWidth: 180, fontSize: 13, color: skipped ? "#a36b00" : "var(--ink-600)" }}>
                              {!s.enabled
                                ? "Pause"
                                : skipped
                                ? `Springer over · ${rain.toFixed(1)} mm regn ${formatDate(next)}`
                                : `Næste: ${formatDate(next)} kl. ${s.start_time.slice(0, 5)}${rain > 0 ? ` · ${rain.toFixed(1)} mm regn ventet` : ""}`}
                            </div>
                            <button onClick={() => deleteSchedule(s.id)} style={delBtn()} aria-label="Slet">×</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <section style={card()}>
              <h2 style={{ fontSize: 20, marginBottom: 14 }}>Seneste vandinger</h2>
              {events.length === 0 && <p style={{ color: "var(--ink-500)", fontSize: 14 }}>Ingen vandinger endnu.</p>}
              <div style={{ display: "grid", gap: 8 }}>
                {events.map((e) => {
                  const z = zones.find((zz) => zz.id === e.zone_id);
                  return (
                    <div key={e.id} style={eventRow()}>
                      <div style={{ fontWeight: 500 }}>{z?.name ?? "Zone"}</div>
                      <div style={{ color: "var(--ink-500)", fontSize: 13 }}>
                        {formatDate(new Date(e.scheduled_for))} kl. {new Date(e.scheduled_for).toTimeString().slice(0, 5)}
                      </div>
                      <div style={{ fontSize: 13, color: e.weather_skipped ? "#a36b00" : "var(--forest-800)" }}>
                        {e.weather_skipped ? `Sprunget over · ${e.reason ?? "regn"}` : e.ran_at ? `Vandet · ${e.mm_delivered ?? 0} mm` : "Planlagt"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
      <SiteFooter />
    </>
  );
}

function formatDate(d: Date) {
  return d.toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "short" });
}

function card(): React.CSSProperties {
  return {
    background: "#fff",
    border: "1px solid rgba(20,39,29,0.08)",
    borderRadius: 14,
    padding: 24,
    marginBottom: 20,
  };
}
function schedRow(): React.CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    padding: 12,
    border: "1px solid rgba(20,39,29,0.08)",
    borderRadius: 10,
    background: "rgba(20,39,29,0.02)",
  };
}
function input(width?: number): React.CSSProperties {
  return {
    border: "1px solid rgba(20,39,29,0.15)",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 14,
    background: "#fff",
    width: width ?? 140,
  };
}
function dayChip(active: boolean): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "1px solid rgba(20,39,29,0.15)",
    background: active ? "var(--forest-800)" : "#fff",
    color: active ? "#fff" : "var(--forest-800)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };
}
function toggle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "var(--ink-600)",
    cursor: "pointer",
  };
}
function delBtn(): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1px solid rgba(20,39,29,0.15)",
    background: "#fff",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
    color: "var(--ink-500)",
  };
}
function eventRow(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "1fr auto auto",
    gap: 16,
    alignItems: "center",
    padding: "10px 14px",
    border: "1px solid rgba(20,39,29,0.06)",
    borderRadius: 10,
  };
}
