import type { Forecast } from "@/lib/wateringAI";
import type { HealthScore } from "@/lib/companionTypes";

type ZoneLike = { id: string; name?: string | null; sun_exposure?: string | null };
type PlantLike = { id: string; zone_id?: string | null; health_status?: string | null; lifecycle_status?: string | null; last_observed_at?: string | null };
type ObservationLike = { kind: string; zone_id?: string | null; plant_id?: string | null; confidence?: number | null; created_at: string; ai_result?: unknown };
type TaskLike = { done?: boolean | null; priority?: string | null; zone_id?: string | null; plant_id?: string | null; kind?: string | null };
type DeviceLike = { kind: string; status: string; battery?: number | null; metadata?: unknown };
type ReadingLike = { kind: string; value?: number | null; zone_id?: string | null; observed_at: string };
type HealthLogLike = { severity?: string | null; zone_id?: string | null; plant_id?: string | null; created_at: string };
type GrowthLike = { zone_id?: string | null; plant_id?: string | null; anomaly_flags?: string[] | null; vigor?: string | null; created_at: string };

type ScoreInput = {
  zones?: ZoneLike[];
  plants?: PlantLike[];
  observations?: ObservationLike[];
  tasks?: TaskLike[];
  devices?: DeviceLike[];
  readings?: ReadingLike[];
  healthLogs?: HealthLogLike[];
  growthSnapshots?: GrowthLike[];
  forecasts?: Forecast[];
  zoneId?: string | null;
  plantId?: string | null;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function status(score: number): HealthScore["status"] {
  if (score < 45) return "critical";
  if (score < 65) return "risk";
  if (score < 82) return "watch";
  return "good";
}

function metaZoneId(device: DeviceLike) {
  const metadata = device.metadata && typeof device.metadata === "object" ? device.metadata as Record<string, unknown> : {};
  return typeof metadata.zone_id === "string" ? metadata.zone_id : null;
}

function metaMoisture(device: DeviceLike) {
  const metadata = device.metadata && typeof device.metadata === "object" ? device.metadata as Record<string, unknown> : {};
  return typeof metadata.moisture_pct === "number" ? metadata.moisture_pct : null;
}

function matchesZone<T extends { zone_id?: string | null }>(row: T, zoneId?: string | null) {
  return !zoneId || row.zone_id === zoneId;
}

function matchesPlant<T extends { plant_id?: string | null }>(row: T, plantId?: string | null) {
  return !plantId || row.plant_id === plantId;
}

export function computeHealthScore(input: ScoreInput): HealthScore {
  let score = 92;
  const factors: string[] = [];

  const openTasks = (input.tasks ?? []).filter((task) => !task.done && matchesZone(task, input.zoneId) && matchesPlant(task, input.plantId));
  const urgentTasks = openTasks.filter((task) => task.priority === "urgent" || task.priority === "high");
  if (openTasks.length > 0) {
    score -= Math.min(18, openTasks.length * 3);
    factors.push(`${openTasks.length} åbne opgaver`);
  }
  if (urgentTasks.length > 0) {
    score -= Math.min(24, urgentTasks.length * 8);
    factors.push(`${urgentTasks.length} vigtige opgaver`);
  }

  const recentHealth = (input.healthLogs ?? [])
    .filter((log) => matchesZone(log, input.zoneId) && matchesPlant(log, input.plantId))
    .slice(0, 8);
  const high = recentHealth.filter((log) => log.severity === "high").length;
  const medium = recentHealth.filter((log) => log.severity === "medium").length;
  if (high > 0 || medium > 0) {
    score -= high * 22 + medium * 12;
    factors.push(high > 0 ? "akut sygdomsrisiko" : "sygdom skal følges");
  }

  const growthIssues = (input.growthSnapshots ?? [])
    .filter((snap) => matchesZone(snap, input.zoneId) && matchesPlant(snap, input.plantId))
    .filter((snap) => (snap.anomaly_flags ?? []).length > 0 || snap.vigor === "svag" || snap.vigor === "weak");
  if (growthIssues.length > 0) {
    score -= Math.min(16, growthIssues.length * 8);
    factors.push("vækstafvigelse");
  }

  const dryDevices = (input.devices ?? [])
    .filter((device) => !input.zoneId || metaZoneId(device) === input.zoneId)
    .filter((device) => device.kind === "sensor" && metaMoisture(device) !== null && (metaMoisture(device) ?? 100) < 28);
  const dryReadings = (input.readings ?? [])
    .filter((reading) => matchesZone(reading, input.zoneId))
    .filter((reading) => reading.kind.includes("moisture") && typeof reading.value === "number" && reading.value < 28);
  if (dryDevices.length > 0 || dryReadings.length > 0) {
    score -= 14;
    factors.push("tør jord");
  }

  const offlineDevices = (input.devices ?? [])
    .filter((device) => !input.zoneId || metaZoneId(device) === input.zoneId)
    .filter((device) => device.status !== "online" && device.status !== "running");
  if (offlineDevices.length > 0) {
    score -= Math.min(10, offlineDevices.length * 4);
    factors.push("enhed kræver opmærksomhed");
  }

  const today = input.forecasts?.[0];
  if (today && (today.temp_min ?? 10) <= 2) {
    score -= 10;
    factors.push("frostpres");
  }
  if (today && (today.temp_max ?? 0) >= 28) {
    score -= 8;
    factors.push("varmepres");
  }
  if (today && (today.precip_mm ?? 0) >= 12) {
    score -= 5;
    factors.push("meget regn");
  }

  const finalScore = clamp(score);
  const primary = factors[0] ?? null;
  return {
    score: finalScore,
    status: status(finalScore),
    factors: factors.slice(0, 5),
    primary_risk: primary,
    explanation: primary ? `Primært påvirket af ${primary}.` : "Ingen tydelige risici i de aktuelle signaler.",
  };
}

export function computeZoneScores(input: Omit<ScoreInput, "zoneId" | "plantId">) {
  return Object.fromEntries((input.zones ?? []).map((zone) => [zone.id, computeHealthScore({ ...input, zoneId: zone.id })]));
}

export function computePlantScores(input: Omit<ScoreInput, "zoneId" | "plantId">) {
  return Object.fromEntries((input.plants ?? []).map((plant) => [plant.id, computeHealthScore({ ...input, zoneId: plant.zone_id, plantId: plant.id })]));
}
