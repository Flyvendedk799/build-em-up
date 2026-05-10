import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Droplet, Wifi, WifiOff, Plus, Power, Trash2, Battery, BatteryLow, Gauge, Radio, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type DeviceKind = "sensor" | "sprinkler" | "mower" | "greenhouse";
type Device = {
  id: string;
  user_id: string;
  garden_id: string | null;
  name: string;
  kind: DeviceKind;
  status: string;
  battery: number | null;
  last_seen: string | null;
  metadata: any;
  created_at: string;
};

type Zone = { id: string; name: string };

function timeAgo(iso: string | null) {
  if (!iso) return "aldrig";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "lige nu";
  if (m < 60) return `${m} min siden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} t siden`;
  return `${Math.floor(h / 24)} d siden`;
}

export default function IoTTab({
  gardenId,
  zones,
}: {
  gardenId: string | null;
  zones: Zone[];
}) {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<{ name: string; kind: DeviceKind; zone_id: string }>({
    name: "",
    kind: "sensor",
    zone_id: zones[0]?.id ?? "",
  });

  async function load() {
    if (!user) return;
    setLoading(true);
    const q = supabase.from("devices").select("*").order("created_at", { ascending: false });
    if (gardenId) q.eq("garden_id", gardenId);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setDevices((data ?? []) as Device[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel("devices-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, gardenId]);

  async function addDevice() {
    if (!user) return;
    if (!draft.name.trim()) {
      toast.error("Giv enheden et navn");
      return;
    }
    const meta: any = { simulated: true };
    if (draft.kind === "sensor") {
      meta.moisture_pct = Math.round(40 + Math.random() * 40);
      meta.temp_c = Math.round(15 + Math.random() * 10);
    }
    if (draft.zone_id) meta.zone_id = draft.zone_id;
    const { error } = await supabase.from("devices").insert({
      user_id: user.id,
      garden_id: gardenId,
      name: draft.name,
      kind: draft.kind,
      status: draft.kind === "sensor" ? "online" : "idle",
      battery: draft.kind === "sensor" ? 100 : null,
      last_seen: new Date().toISOString(),
      metadata: meta,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Enhed tilføjet");
      setAddOpen(false);
      setDraft({ name: "", kind: "sensor", zone_id: zones[0]?.id ?? "" });
    }
  }

  async function deleteDevice(id: string) {
    const { error } = await supabase.from("devices").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Enhed fjernet");
  }

  async function toggleValve(d: Device) {
    const newStatus = d.status === "running" ? "idle" : "running";
    const meta = {
      ...(d.metadata || {}),
      last_run_at: newStatus === "running" ? new Date().toISOString() : d.metadata?.last_run_at,
    };
    const { error } = await supabase
      .from("devices")
      .update({ status: newStatus, last_seen: new Date().toISOString(), metadata: meta })
      .eq("id", d.id);
    if (error) toast.error(error.message);
    else {
      if (newStatus === "running" && user && d.metadata?.zone_id) {
        await supabase.from("watering_runs").insert({
          user_id: user.id,
          zone_id: d.metadata.zone_id,
          source: "iot",
          mm: 5,
          notes: `Ventil ${d.name}`,
        });
      }
      toast.success(newStatus === "running" ? "Ventil åbnet" : "Ventil lukket");
    }
  }

  async function pingSensor(d: Device) {
    const moisture = Math.max(5, Math.min(95, (d.metadata?.moisture_pct ?? 50) + (Math.random() * 20 - 10)));
    const temp = Math.round(12 + Math.random() * 14);
    const battery = Math.max(5, (d.battery ?? 100) - Math.round(Math.random() * 2));
    const { error } = await supabase
      .from("devices")
      .update({
        status: "online",
        battery,
        last_seen: new Date().toISOString(),
        metadata: { ...(d.metadata || {}), moisture_pct: Math.round(moisture), temp_c: temp },
      })
      .eq("id", d.id);
    if (error) toast.error(error.message);
    else toast.success(`Måling: ${Math.round(moisture)}% fugt`);
  }

  const sensors = devices.filter((d) => d.kind === "sensor");
  const valves = devices.filter((d) => d.kind === "sprinkler");
  const others = devices.filter((d) => d.kind !== "sensor" && d.kind !== "sprinkler");

  const avgMoisture = useMemo(() => {
    const vals = sensors.map((s) => s.metadata?.moisture_pct).filter((v) => typeof v === "number");
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [sensors]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)",
          borderRadius: 16,
          padding: 20,
          color: "white",
          display: "flex",
          gap: 24,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.9, fontSize: 13 }}>
            <Radio size={14} /> Smart Have · IoT
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: "4px 0 2px" }}>
            {devices.length === 0 ? "Forbind dine enheder" : `${devices.length} enhed${devices.length === 1 ? "" : "er"} aktiv`}
          </h2>
          <p style={{ opacity: 0.85, fontSize: 13, margin: 0 }}>
            Fugtsensorer, magnetventiler og smart-controllere — alt samlet ét sted.
          </p>
        </div>
        {avgMoisture !== null && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>{avgMoisture}%</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>Gns. jordfugt</div>
          </div>
        )}
        <Button variant="secondary" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Tilføj enhed
        </Button>
      </div>

      <section>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-500)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Gauge size={14} /> Fugtsensorer ({sensors.length})
        </h3>
        {sensors.length === 0 ? (
          <Card><CardContent style={{ padding: 16, fontSize: 13, color: "var(--ink-500)" }}>
            Ingen sensorer endnu. Tilføj én for at se realtid jordfugt pr. bed.
          </CardContent></Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            <AnimatePresence initial={false}>
              {sensors.map((d) => {
                const m = d.metadata?.moisture_pct ?? 0;
                const zone = zones.find((z) => z.id === d.metadata?.zone_id);
                const dry = m < 30;
                return (
                  <motion.div
                    key={d.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Card>
                      <CardContent style={{ padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{d.name}</div>
                            <div style={{ fontSize: 11, color: "var(--ink-500)" }}>{zone?.name ?? "Uden bed"}</div>
                          </div>
                          <button onClick={() => deleteDevice(d.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-400)" }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "6px 0" }}>
                          <span style={{ fontSize: 28, fontWeight: 700, color: dry ? "#c47a2c" : "#1a6b3a" }}>{m}%</span>
                          <span style={{ fontSize: 11, color: "var(--ink-500)" }}>fugt · {d.metadata?.temp_c ?? "–"}°C</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: "rgba(20,39,29,0.08)", overflow: "hidden", marginBottom: 8 }}>
                          <div style={{ height: "100%", width: `${m}%`, background: dry ? "#c47a2c" : "#1a6b3a", borderRadius: 999 }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-500)" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {(d.battery ?? 0) < 20 ? <BatteryLow size={12} /> : <Battery size={12} />}
                            {d.battery ?? "?"}%
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Wifi size={12} /> {timeAgo(d.last_seen)}
                          </span>
                        </div>
                        <Button size="sm" variant="ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => pingSensor(d)}>
                          <PlayCircle size={12} /> Mål nu
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      <section>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-500)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Droplet size={14} /> Magnetventiler & sprinklere ({valves.length})
        </h3>
        {valves.length === 0 ? (
          <Card><CardContent style={{ padding: 16, fontSize: 13, color: "var(--ink-500)" }}>
            Ingen ventiler. Tilføj én for at styre vanding direkte fra appen.
          </CardContent></Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {valves.map((d) => {
              const zone = zones.find((z) => z.id === d.metadata?.zone_id);
              const running = d.status === "running";
              return (
                <Card key={d.id}>
                  <CardContent style={{ padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{d.name}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-500)" }}>{zone?.name ?? "Uden bed"}</div>
                      </div>
                      <button onClick={() => deleteDevice(d.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-400)" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: running ? "rgba(58,138,204,0.12)" : "var(--ink-50)",
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: running ? "#3a8acc" : "var(--ink-700)" }}>
                        <Power size={14} /> {running ? "Vander…" : "Inaktiv"}
                      </span>
                      <Switch checked={running} onCheckedChange={() => toggleValve(d)} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-500)", display: "flex", justifyContent: "space-between" }}>
                      <span>{d.status === "online" || d.status === "running" || d.status === "idle"
                        ? <><Wifi size={11} style={{ display: "inline" }} /> {timeAgo(d.last_seen)}</>
                        : <><WifiOff size={11} style={{ display: "inline" }} /> offline</>}</span>
                      {d.metadata?.last_run_at && <span>Sidst: {timeAgo(d.metadata.last_run_at)}</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {others.length > 0 && (
        <section>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-500)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Cpu size={14} /> Øvrige enheder ({others.length})
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {others.map((d) => (
              <Card key={d.id}>
                <CardContent style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-500)" }}>{d.kind} · {d.status}</div>
                  </div>
                  <button onClick={() => deleteDevice(d.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-400)" }}>
                    <Trash2 size={14} />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {loading && <div style={{ textAlign: "center", color: "var(--ink-500)", fontSize: 13 }}>Indlæser…</div>}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tilføj smart enhed</DialogTitle></DialogHeader>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <Label>Navn</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="fx Sensor i tomatbed" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as DeviceKind })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sensor">Fugtsensor</SelectItem>
                  <SelectItem value="sprinkler">Magnetventil / sprinkler</SelectItem>
                  <SelectItem value="mower">Robotplæneklipper</SelectItem>
                  <SelectItem value="greenhouse">Drivhus-controller</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {zones.length > 0 && (
              <div>
                <Label>Tilknyt bed</Label>
                <Select value={draft.zone_id} onValueChange={(v) => setDraft({ ...draft, zone_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Vælg bed" /></SelectTrigger>
                  <SelectContent>
                    {zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <p style={{ fontSize: 11, color: "var(--ink-500)" }}>
              Demo-tilstand: Enheden simuleres lokalt. Reelle integrationer (Gardena, Eve, MQTT) tilføjes senere.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Annullér</Button>
            <Button onClick={addDevice}>Tilføj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
