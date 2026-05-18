import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, CalendarDays, Droplets, Leaf, Map, NotebookPen, Radio, Sprout, Users } from "lucide-react";
import { toast } from "sonner";
import { AppNav, SiteFooter } from "@/components/layout/SiteChrome";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { useActiveGarden } from "@/lib/activeGarden";
import type { CompanionView, CareAction, MapAnchor } from "@/lib/companionTypes";
import { generateDeviceActions, generateWeatherActions } from "@/lib/companionActions";
import { fetchForecast, type Forecast, type Schedule, weekSummary } from "@/lib/wateringAI";
import CompanionToday from "@/components/companion/CompanionToday";
import GardenMap from "@/components/companion/GardenMap";
import GardenCamera from "@/components/companion/GardenCamera";
import CarePlan from "@/components/companion/CarePlan";
import MorningBriefing from "@/components/watering/MorningBriefing";
import CalendarTimeline from "@/components/watering/CalendarTimeline";
import JournalTab from "@/components/watering/JournalTab";
import IoTTab from "@/components/watering/IoTTab";
import InsightsTab from "@/components/watering/InsightsTab";
import NeighborsTab from "@/components/watering/NeighborsTab";
import CalendarTab from "@/components/watering/CalendarTab";
import type { ZonePlant } from "@/components/watering/PlantChips";
import "@/styles/companion.css";

type View = CompanionView | "yearwheel" | "community";
type Garden = Tables<"gardens">;
type Zone = Tables<"garden_zones">;
type Plant = Tables<"user_plants"> & {
  plants_catalog?: { name_da: string | null; water_need: string | null; image_url: string | null } | null;
};
type Observation = Tables<"garden_observations">;
type Device = Tables<"devices">;
type Task = Tables<"task_log">;
type EventRow = Tables<"watering_events">;
type CatalogCalendar = {
  slug: string;
  name_da: string;
  sow_months?: number[] | null;
  harvest_months?: number[] | null;
  transplant_months?: number[] | null;
  prune_months?: number[] | null;
  winterize_months?: number[] | null;
};

const PRIMARY: { key: View; label: string }[] = [
  { key: "today", label: "I dag" },
  { key: "map", label: "Kort" },
  { key: "scan", label: "Scan" },
  { key: "plan", label: "Plan" },
];

const SECONDARY: { key: View; label: string; icon: React.ElementType }[] = [
  { key: "plants", label: "Planter", icon: Sprout },
  { key: "water", label: "Vanding", icon: Droplets },
  { key: "journal", label: "Dagbog", icon: NotebookPen },
  { key: "devices", label: "Smart have", icon: Radio },
  { key: "yearwheel", label: "Årshjul", icon: CalendarDays },
  { key: "community", label: "Nabolag", icon: Users },
  { key: "insights", label: "Indsigt", icon: BarChart3 },
];

function priorityOf(value: string | null): CareAction["priority"] {
  if (value === "urgent" || value === "high" || value === "low") return value;
  return "normal";
}

function sourceOf(value: string | null): CareAction["source"] {
  if (value === "ai" || value === "weather" || value === "sensor" || value === "season" || value === "scan") return value;
  return "manual";
}

function statusOf(task: Task): CareAction["status"] {
  if (task.done) return "done";
  if (task.snoozed_until && new Date(task.snoozed_until).getTime() > Date.now()) return "snoozed";
  return "open";
}

function taskToAction(task: Task): CareAction {
  return {
    id: task.id,
    kind: task.kind,
    title: task.title,
    reason: task.reason || task.notes,
    priority: priorityOf(task.priority),
    due_at: task.due_at,
    status: statusOf(task),
    source: sourceOf(task.source),
    confidence: task.confidence,
    garden_id: task.garden_id || "",
    zone_id: task.zone_id,
    plant_id: task.plant_id,
    observation_id: task.observation_id,
    payload: task.payload,
  };
}

function actionToTaskInsert(userId: string, action: Omit<CareAction, "id">) {
  return {
    user_id: userId,
    garden_id: action.garden_id,
    zone_id: action.zone_id ?? null,
    plant_id: action.plant_id ?? null,
    observation_id: action.observation_id ?? null,
    kind: action.kind,
    title: action.title,
    notes: action.reason ?? null,
    due_at: action.due_at ?? null,
    priority: action.priority,
    source: action.source,
    reason: action.reason ?? null,
    confidence: action.confidence ?? null,
    payload: action.payload ?? {},
  };
}

function readAnchor(anchor: unknown): MapAnchor {
  return (anchor && typeof anchor === "object" ? anchor : {}) as MapAnchor;
}

export default function GardenCompanion() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { activeGardenId, setActive } = useActiveGarden();
  const [view, setView] = useState<View>(() => (localStorage.getItem("companion.view") as View) || "today");
  const [loading, setLoading] = useState(true);
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [garden, setGarden] = useState<Garden | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [catalogBySlug, setCatalogBySlug] = useState<Record<string, CatalogCalendar>>({});

  const setViewPersist = (next: View) => {
    setView(next);
    localStorage.setItem("companion.view", next);
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: gardenRows } = await supabase
      .from("gardens")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    const gardenList = (gardenRows ?? []) as Garden[];
    setGardens(gardenList);
    const active = gardenList.find((g) => g.id === activeGardenId) ?? gardenList[0] ?? null;
    setGarden(active);
    if (active && active.id !== activeGardenId) setActive(active.id);

    if (!active) {
      setZones([]);
      setPlants([]);
      setObservations([]);
      setTasks([]);
      setDevices([]);
      setSchedules([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    const [
      { data: zoneRows },
      { data: plantRows },
      { data: observationRows },
      { data: taskRows },
      { data: deviceRows },
      { data: scheduleRows },
      { data: eventRows },
    ] = await Promise.all([
      supabase.from("garden_zones").select("*").eq("garden_id", active.id).order("created_at", { ascending: true }),
      supabase.from("user_plants")
        .select("*,plants_catalog(name_da,water_need,image_url)")
        .eq("garden_id", active.id)
        .order("created_at", { ascending: false }),
      supabase.from("garden_observations").select("*").eq("garden_id", active.id).order("created_at", { ascending: false }).limit(200),
      supabase.from("task_log").select("*").eq("garden_id", active.id).order("due_at", { ascending: true, nullsFirst: false }).limit(120),
      supabase.from("devices").select("*").eq("garden_id", active.id).order("created_at", { ascending: false }),
      supabase.from("watering_schedules").select("*").eq("user_id", user.id),
      supabase.from("watering_events").select("*").eq("user_id", user.id).order("scheduled_for", { ascending: false }).limit(250),
    ]);

    setZones((zoneRows ?? []) as Zone[]);
    setPlants((plantRows ?? []) as Plant[]);
    setObservations((observationRows ?? []) as Observation[]);
    setTasks((taskRows ?? []) as Task[]);
    setDevices((deviceRows ?? []) as Device[]);
    setSchedules((scheduleRows ?? []) as Schedule[]);
    setEvents((eventRows ?? []) as EventRow[]);
    setLoading(false);
  }, [activeGardenId, setActive, user]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?next=/havekompagnon");
  }, [authLoading, navigate, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!garden?.latitude || !garden?.longitude) {
      setForecasts([]);
      return;
    }
    fetchForecast(garden.latitude, garden.longitude).then(setForecasts).catch(() => setForecasts([]));
  }, [garden?.latitude, garden?.longitude]);

  useEffect(() => {
    const slugs = Array.from(new Set(plants.map((p) => p.plant_slug).filter(Boolean) as string[]));
    if (slugs.length === 0) {
      setCatalogBySlug({});
      return;
    }
    supabase.from("plants_catalog")
      .select("slug,name_da,sow_months,harvest_months,transplant_months,prune_months,winterize_months")
      .in("slug", slugs)
      .then(({ data }) => {
        const map: Record<string, CatalogCalendar> = {};
        ((data ?? []) as CatalogCalendar[]).forEach((row) => { map[row.slug] = row; });
        setCatalogBySlug(map);
      });
  }, [plants]);

  const zoneNames = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z.name])), [zones]);
  const plantsByZone = useMemo(() => {
    const map: Record<string, ZonePlant[]> = {};
    plants.forEach((plant) => {
      if (!plant.zone_id) return;
      (map[plant.zone_id] ||= []).push({
        id: plant.id,
        zone_id: plant.zone_id,
        plant_slug: plant.plant_slug,
        custom_name: plant.custom_name,
        qty: plant.qty,
        planted_at: plant.planted_at,
        notes: plant.notes,
        image_url: plant.image_url || plant.plants_catalog?.image_url,
        name_da: plant.plants_catalog?.name_da,
        water_need: plant.plants_catalog?.water_need,
      });
    });
    return map;
  }, [plants]);

  const summary = useMemo(() => weekSummary(schedules, zones, forecasts), [forecasts, schedules, zones]);
  const actions = useMemo(() => tasks.map(taskToAction), [tasks]);
  const suggestions = useMemo(() => {
    if (!garden) return [];
    const existingTitles = new Set(actions.filter((a) => a.status !== "done").map((a) => a.title));
    return [
      ...generateWeatherActions(garden.id, zones, forecasts),
      ...generateDeviceActions(garden.id, devices),
    ].filter((a) => !existingTitles.has(a.title));
  }, [actions, devices, forecasts, garden, zones]);

  async function completeAction(id: string) {
    const { error } = await supabase.from("task_log").update({ done: true, done_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTasks((prev) => prev.map((task) => task.id === id ? { ...task, done: true, done_at: new Date().toISOString() } : task));
    toast.success("Opgave markeret som klar");
  }

  async function snoozeAction(id: string) {
    const snoozed = new Date(Date.now() + 24 * 3600_000).toISOString();
    const { error } = await supabase.from("task_log").update({ snoozed_until: snoozed }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTasks((prev) => prev.map((task) => task.id === id ? { ...task, snoozed_until: snoozed } : task));
    toast.success("Snoozet til i morgen");
  }

  async function createSuggestion(action: Omit<CareAction, "id">) {
    if (!user) return;
    const { data, error } = await supabase.from("task_log").insert(actionToTaskInsert(user.id, action)).select().single();
    if (error || !data) {
      toast.error(error?.message ?? "Kunne ikke oprette opgave");
      return;
    }
    setTasks((prev) => [...prev, data as Task]);
    toast.success("Tilføjet til plejeplanen");
  }

  async function movePlant(id: string, x: number, y: number) {
    const patch = { normalized_x: x, normalized_y: y, accuracy: "manual" };
    await supabase.from("user_plants").update({ map_position: patch }).eq("id", id);
    setPlants((prev) => prev.map((p) => p.id === id ? { ...p, map_position: patch as Json } as Plant : p));
  }

  async function moveObservation(id: string, x: number, y: number) {
    const current = observations.find((o) => o.id === id);
    const next = { ...readAnchor(current?.anchor), normalized_x: x, normalized_y: y, accuracy: "manual" };
    await supabase.from("garden_observations").update({ anchor: next }).eq("id", id);
    setObservations((prev) => prev.map((o) => o.id === id ? { ...o, anchor: next as Json } as Observation : o));
  }

  async function moveDevice(id: string, x: number, y: number) {
    const patch = { normalized_x: x, normalized_y: y, accuracy: "manual" };
    await supabase.from("devices").update({ map_position: patch }).eq("id", id);
    setDevices((prev) => prev.map((d) => d.id === id ? { ...d, map_position: patch as Json } as Device : d));
  }

  if (authLoading || (!user && !authLoading)) return null;

  if (loading) {
    return (
      <>
        <AppNav active="companion" />
        <div className="container companion-loading">Havekompagnonen vågner...</div>
      </>
    );
  }

  if (!garden || !user) {
    return (
      <>
        <AppNav active="companion" />
        <div className="container companion-empty-page">
          <div className="companion-eyebrow">Havekompagnonen</div>
          <h1>Start med at måle din have.</h1>
          <p>Så kan vi placere bede, planter, fotos, sygdomme, sensorer og vandingszoner på et levende kort.</p>
          <Link to="/havemaaler" className="btn btn-primary">Mål min have</Link>
        </div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <AppNav active="companion" />
      <div className="container companion-page">
        <header className="companion-page-head">
          <div>
            <div className="companion-eyebrow">Havekompagnonen</div>
            <h1>Din levende have på kort, kamera og plan.</h1>
            <p>Scan planter, placer fotos, følg vækst, opdage sygdomme og lad smart vanding arbejde sammen med vejret.</p>
          </div>
          {gardens.length > 1 && (
            <div className="companion-garden-switch">
              {gardens.map((g) => (
                <button key={g.id} className={g.id === garden.id ? "active" : ""} onClick={() => setActive(g.id)}>
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </header>

        <nav className="companion-primary-nav" aria-label="Havekompagnon hovedvisning">
          {PRIMARY.map((item) => (
            <button key={item.key} className={view === item.key ? "active" : ""} onClick={() => setViewPersist(item.key)}>
              {item.label}
            </button>
          ))}
        </nav>

        {view === "today" && (
          <>
            <CompanionToday
              garden={garden}
              zones={zones}
              plantCount={plants.reduce((sum, p) => sum + (p.qty || 1), 0)}
              openActions={actions.filter((a) => a.status === "open")}
              forecast={forecasts[0] ?? null}
              plannedL={summary.plannedL}
              savedL={summary.savedL}
              devices={devices}
              onScan={() => setViewPersist("scan")}
              onMap={() => setViewPersist("map")}
              onPlan={() => setViewPersist("plan")}
              onCompleteAction={completeAction}
            />
            <MorningBriefing userId={user.id} />
          </>
        )}

        {view === "map" && (
          <GardenMap
            garden={garden}
            zones={zones}
            plants={plants}
            observations={observations}
            devices={devices}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
            onMovePlant={movePlant}
            onMoveObservation={moveObservation}
            onMoveDevice={moveDevice}
          />
        )}

        {view === "scan" && (
          <GardenCamera
            userId={user.id}
            garden={garden}
            zones={zones}
            plants={plants}
            observations={observations}
            defaultZoneId={selectedZoneId}
            onSaved={load}
          />
        )}

        {view === "plan" && (
          <CarePlan
            actions={actions}
            suggestions={suggestions}
            zoneNames={zoneNames}
            onComplete={completeAction}
            onSnooze={snoozeAction}
            onCreateSuggestion={createSuggestion}
          />
        )}

        <section className="companion-secondary">
          <div className="companion-secondary-head">
            <div>
              <div className="companion-eyebrow">Dybdeværktøjer</div>
              <h2>Alt det kraftige ligger stadig lige under overfladen.</h2>
            </div>
          </div>
          <div className="companion-secondary-nav">
            {SECONDARY.map(({ key, label, icon: Icon }) => (
              <button key={key} className={view === key ? "active" : ""} onClick={() => setViewPersist(key)}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          {view === "plants" && <PlantInventory plants={plants} zones={zones} onScan={() => setViewPersist("scan")} />}
          {view === "water" && (
            <CalendarTimeline
              schedules={schedules}
              zones={zones}
              forecasts={forecasts}
              opts={{}}
              onSnooze={() => toast.success("Vanding sprunget over for denne visning")}
            />
          )}
          {view === "journal" && <JournalTab gardenId={garden.id} zones={zones} plantsByZone={plantsByZone} />}
          {view === "devices" && <IoTTab gardenId={garden.id} zones={zones} />}
          {view === "yearwheel" && <CalendarTab gardenId={garden.id} zones={zones} plantsByZone={plantsByZone} catalogBySlug={catalogBySlug} />}
          {view === "community" && <NeighborsTab />}
          {view === "insights" && <InsightsTab events={events} zones={zones} />}
        </section>
      </div>
      <SiteFooter />
    </>
  );
}

function PlantInventory({ plants, zones, onScan }: { plants: Plant[]; zones: Zone[]; onScan: () => void }) {
  if (plants.length === 0) {
    return (
      <div className="companion-band companion-empty">
        <Leaf size={20} />
        Ingen planter endnu. Brug Scan til at identificere og placere den første plante.
        <Button onClick={onScan}>Scan plante</Button>
      </div>
    );
  }
  return (
    <div className="companion-plant-grid">
      {plants.map((plant) => (
        <article key={plant.id} className="companion-plant-card">
          {plant.image_url ? <img src={plant.image_url} alt="" /> : <div className="companion-plant-fallback"><Sprout size={20} /></div>}
          <div>
            <h3>{plant.custom_name || plant.plants_catalog?.name_da || plant.plant_slug || "Plante"}</h3>
            <p>{zones.find((z) => z.id === plant.zone_id)?.name ?? "Ikke placeret"} · {plant.health_status || "ukendt helbred"}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
