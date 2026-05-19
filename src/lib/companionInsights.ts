import type { Forecast } from "@/lib/wateringAI";
import type { CareAction, HealthScore, ZoneInsight } from "@/lib/companionTypes";

type ZoneLike = { id: string; name: string; type?: string | null; sun_exposure?: string | null };
type PlantLike = { id: string; zone_id?: string | null; plant_slug?: string | null; custom_name?: string | null };
type DeviceLike = { kind: string; status: string; metadata?: unknown };
type ReadingLike = { kind: string; value?: number | null; zone_id?: string | null };
type TaskLike = { title: string; kind: string; done?: boolean | null; priority?: string | null; zone_id?: string | null; plant_id?: string | null; source?: string | null; payload?: unknown };
type ObservationLike = { kind: string; zone_id?: string | null; plant_id?: string | null; ai_result?: unknown; created_at: string };
type CatalogLike = {
  slug: string;
  name_da: string;
  sow_months?: number[] | null;
  harvest_months?: number[] | null;
  transplant_months?: number[] | null;
  prune_months?: number[] | null;
  winterize_months?: number[] | null;
};

function metaZoneId(device: DeviceLike) {
  const metadata = device.metadata && typeof device.metadata === "object" ? device.metadata as Record<string, unknown> : {};
  return typeof metadata.zone_id === "string" ? metadata.zone_id : null;
}

function metaMoisture(device: DeviceLike) {
  const metadata = device.metadata && typeof device.metadata === "object" ? device.metadata as Record<string, unknown> : {};
  return typeof metadata.moisture_pct === "number" ? metadata.moisture_pct : null;
}

function dueInDays(days: number) {
  return new Date(Date.now() + days * 86400_000).toISOString();
}

export function generateZoneInsights(input: {
  zone: ZoneLike;
  healthScore?: HealthScore;
  observations?: ObservationLike[];
  tasks?: TaskLike[];
  devices?: DeviceLike[];
  readings?: ReadingLike[];
  forecasts?: Forecast[];
}): ZoneInsight[] {
  const insights: ZoneInsight[] = [];
  const zoneId = input.zone.id;
  const openTasks = (input.tasks ?? []).filter((task) => !task.done && task.zone_id === zoneId);
  const dryDevice = (input.devices ?? []).find((device) => metaZoneId(device) === zoneId && metaMoisture(device) !== null && (metaMoisture(device) ?? 100) < 28);
  const latestDiagnosis = (input.observations ?? []).find((obs) => obs.zone_id === zoneId && (obs.kind === "diagnosis" || obs.kind === "bed_scan"));
  const today = input.forecasts?.[0];

  if (input.healthScore && input.healthScore.status !== "good") {
    insights.push({
      title: `Tjek ${input.zone.name}`,
      reason: input.healthScore.explanation,
      priority: input.healthScore.status === "critical" ? "urgent" : input.healthScore.status === "risk" ? "high" : "normal",
      action_kind: "zone_health_check",
      confidence: 0.82,
      source: "task",
    });
  }
  if (dryDevice) {
    insights.push({
      title: `${input.zone.name} melder tør jord`,
      reason: `Sensoren ligger omkring ${Math.round(metaMoisture(dryDevice) ?? 0)}% fugt. Bekræft før vanding.`,
      priority: "high",
      action_kind: "sensor_dry",
      confidence: 0.78,
      source: "sensor",
    });
  }
  if (latestDiagnosis) {
    insights.push({
      title: "Følg op på seneste scan",
      reason: latestDiagnosis.kind === "bed_scan" ? "Bedscanningen kan have fundet tæthed, ukrudt eller sygdomspres." : "Der ligger en diagnose i zonens historik.",
      priority: "high",
      action_kind: "scan_followup",
      confidence: 0.72,
      source: "scan",
    });
  }
  if (today && (today.temp_max ?? 0) >= 28 && input.zone.sun_exposure === "sun") {
    insights.push({
      title: "Hold øje med varmestress",
      reason: `${Math.round(today.temp_max)} grader og sol kan give slappe blade i ${input.zone.name}.`,
      priority: "high",
      action_kind: "heat_watch",
      confidence: 0.7,
      source: "weather",
    });
  }
  if (openTasks.length > 2) {
    insights.push({
      title: "Ryd op i opgaverne",
      reason: `${openTasks.length} åbne opgaver samler sig i zonen.`,
      priority: "normal",
      action_kind: "task_backlog",
      confidence: 0.9,
      source: "task",
    });
  }

  return insights.slice(0, 4);
}

export function generateSeasonActions(input: {
  gardenId: string;
  zones: ZoneLike[];
  plants: PlantLike[];
  catalogBySlug: Record<string, CatalogLike>;
  existingTasks: TaskLike[];
  month?: number;
}): Omit<CareAction, "id">[] {
  const month = input.month ?? new Date().getMonth() + 1;
  const existing = new Set(input.existingTasks.map((task) => `${task.kind}:${task.zone_id ?? ""}:${task.title}:${month}`));
  const actions: Omit<CareAction, "id">[] = [];

  const add = (kind: string, title: string, zoneId: string | null, reason: string, priority: CareAction["priority"] = "normal") => {
    const key = `${kind}:${zoneId ?? ""}:${title}:${month}`;
    if (existing.has(key)) return;
    existing.add(key);
    actions.push({
      kind,
      title,
      reason,
      priority,
      due_at: dueInDays(7),
      status: "open",
      source: "season",
      confidence: 0.74,
      garden_id: input.gardenId,
      zone_id: zoneId,
      payload: { month, generated_by: "season_plan" },
    });
  };

  for (const plant of input.plants) {
    const catalog = plant.plant_slug ? input.catalogBySlug[plant.plant_slug] : null;
    const name = plant.custom_name || catalog?.name_da || plant.plant_slug || "plante";
    if (catalog?.sow_months?.includes(month)) add("sow", `Så ${name}`, plant.zone_id ?? null, `${name} kan sås i denne måned.`);
    if (catalog?.transplant_months?.includes(month)) add("transplant", `Udplant ${name}`, plant.zone_id ?? null, `${name} passer til udplantning nu.`);
    if (catalog?.harvest_months?.includes(month)) add("harvest", `Tjek høst på ${name}`, plant.zone_id ?? null, `${name} kan være høstklar i denne måned.`, "high");
    if (catalog?.prune_months?.includes(month)) add("prune", `Beskær ${name}`, plant.zone_id ?? null, `${name} har beskæring i årshjulet.`);
    if (catalog?.winterize_months?.includes(month)) add("winterize", `Vinterklargør ${name}`, plant.zone_id ?? null, `${name} skal beskyttes eller klargøres.`);
  }

  for (const zone of input.zones) {
    if ((month === 3 || month === 4) && (zone.type === "vegetable" || zone.type === "raised_bed")) {
      add("soil_prep", `Forbered jord i ${zone.name}`, zone.id, "Forårsmåneder er gode til kompost, struktur og såbed.");
    }
    if ((month === 10 || month === 11) && zone.type !== "lawn") {
      add("winter_prep", `Luk ${zone.name} ned for vinteren`, zone.id, "Fjern sygt plantemateriale og beskyt jorden.");
    }
  }

  return actions.slice(0, 12);
}
