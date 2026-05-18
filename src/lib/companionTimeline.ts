import type { Json } from "@/integrations/supabase/types";
import type { ProblemResolutionState, TimelineEvent } from "@/lib/companionTypes";

type ObservationLike = {
  id: string;
  kind: string;
  caption?: string | null;
  image_url?: string | null;
  created_at: string;
  plant_id?: string | null;
  zone_id?: string | null;
  ai_result?: Json;
};
type HealthLogLike = {
  id: string;
  diagnosis?: string | null;
  severity?: string | null;
  treatment?: string | null;
  image_url?: string | null;
  created_at: string;
  plant_id?: string | null;
  zone_id?: string | null;
};
type GrowthLike = {
  id: string;
  observation_id?: string | null;
  stage?: string | null;
  vigor?: string | null;
  estimated_height_cm?: number | null;
  harvest_readiness?: string | null;
  anomaly_flags?: string[] | null;
  created_at: string;
  plant_id?: string | null;
  zone_id?: string | null;
};
type TaskLike = {
  id: string;
  title: string;
  kind: string;
  done?: boolean | null;
  due_at?: string | null;
  created_at?: string | null;
  plant_id?: string | null;
  zone_id?: string | null;
  payload?: Json;
};
type JournalLike = {
  id: string;
  kind: string;
  caption?: string | null;
  image_url?: string | null;
  created_at: string;
  plant_id?: string | null;
  zone_id?: string | null;
  data?: Json;
};

type TimelineInput = {
  observations?: ObservationLike[];
  healthLogs?: HealthLogLike[];
  growthSnapshots?: GrowthLike[];
  tasks?: TaskLike[];
  journal?: JournalLike[];
  plantId?: string | null;
  zoneId?: string | null;
};

function matches(row: { plant_id?: string | null; zone_id?: string | null }, plantId?: string | null, zoneId?: string | null) {
  if (plantId && row.plant_id !== plantId) return false;
  if (!plantId && zoneId && row.zone_id !== zoneId) return false;
  return true;
}

function resultTitle(value: Json | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return String(row.diagnosis || row.summary || row.name_da || row.stage || "").trim() || null;
}

export function buildTimeline(input: TimelineInput): TimelineEvent[] {
  const plantId = input.plantId ?? null;
  const zoneId = input.zoneId ?? null;
  const events: TimelineEvent[] = [];

  for (const observation of input.observations ?? []) {
    if (!matches(observation, plantId, zoneId)) continue;
    events.push({
      id: `obs-${observation.id}`,
      type: observation.kind === "diagnosis" ? "diagnosis" : observation.kind === "growth" ? "growth" : observation.kind === "harvest" ? "harvest" : "photo",
      title: observation.caption || resultTitle(observation.ai_result) || observation.kind,
      subtitle: observation.kind,
      image_url: observation.image_url,
      created_at: observation.created_at,
      source_id: observation.id,
      payload: observation.ai_result,
    });
  }

  for (const log of input.healthLogs ?? []) {
    if (!matches(log, plantId, zoneId)) continue;
    events.push({
      id: `health-${log.id}`,
      type: "diagnosis",
      title: log.diagnosis || "Helbredstjek",
      subtitle: `${log.severity || "ukendt"} · ${log.treatment || "ingen behandling"}`,
      image_url: log.image_url,
      created_at: log.created_at,
      source_id: log.id,
      payload: { severity: log.severity, treatment: log.treatment },
    });
  }

  for (const growth of input.growthSnapshots ?? []) {
    if (!matches(growth, plantId, zoneId)) continue;
    events.push({
      id: `growth-${growth.id}`,
      type: "growth",
      title: growth.stage || growth.vigor || "Vækstobservation",
      subtitle: [
        growth.estimated_height_cm ? `${growth.estimated_height_cm} cm` : null,
        growth.harvest_readiness,
        (growth.anomaly_flags ?? []).length ? `${growth.anomaly_flags?.length} afvigelser` : null,
      ].filter(Boolean).join(" · ") || "vækstspor",
      created_at: growth.created_at,
      source_id: growth.id,
      payload: growth as unknown as Json,
    });
  }

  for (const task of input.tasks ?? []) {
    if (!matches(task, plantId, zoneId)) continue;
    events.push({
      id: `task-${task.id}`,
      type: "task",
      title: task.title,
      subtitle: task.done ? "opgave løst" : `åben · ${task.kind}`,
      created_at: task.due_at || task.created_at || new Date().toISOString(),
      source_id: task.id,
      payload: task.payload,
    });
  }

  for (const entry of input.journal ?? []) {
    if (!matches(entry, plantId, zoneId)) continue;
    events.push({
      id: `journal-${entry.id}`,
      type: entry.kind === "harvest" ? "harvest" : "journal",
      title: entry.caption || entry.kind,
      subtitle: "dagbog",
      image_url: entry.image_url,
      created_at: entry.created_at,
      source_id: entry.id,
      payload: entry.data,
    });
  }

  return events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function latestGrowthPair(growthSnapshots: GrowthLike[], plantId?: string | null, zoneId?: string | null) {
  return growthSnapshots
    .filter((growth) => matches(growth, plantId ?? null, zoneId ?? null))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 2);
}

export function problemResolutionState(healthLogs: HealthLogLike[], tasks: TaskLike[], plantId?: string | null, zoneId?: string | null): ProblemResolutionState {
  const logs = healthLogs
    .filter((log) => matches(log, plantId ?? null, zoneId ?? null))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latest = logs[0];
  if (!latest) return "resolved";
  if (latest.severity === "low") return "resolved";
  const issueTasks = tasks.filter((task) => matches(task, plantId ?? null, zoneId ?? null) && (task.kind === "diagnose" || task.kind === "issue_resolution"));
  if (issueTasks.some((task) => task.done && task.kind === "issue_resolution")) return "improving";
  if (issueTasks.some((task) => !task.done)) return "open";
  return "watching";
}
