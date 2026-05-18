import type { Json } from "@/integrations/supabase/types";

export type CompanionView =
  | "today"
  | "map"
  | "scan"
  | "plan"
  | "plants"
  | "water"
  | "journal"
  | "devices"
  | "insights";

export type ObservationKind =
  | "photo"
  | "identify"
  | "diagnosis"
  | "growth"
  | "bed_scan"
  | "harvest"
  | "watering"
  | "sensor";

export type MapAnchor = {
  garden_id: string;
  zone_id?: string | null;
  plant_id?: string | null;
  point?: Json;
  normalized_x?: number | null;
  normalized_y?: number | null;
  accuracy?: "manual" | "zone_center" | "map_tap" | "gps" | "unknown";
};

export type GardenObservation = {
  id: string;
  kind: ObservationKind;
  image_url?: string | null;
  anchor: MapAnchor;
  ai_result: Record<string, unknown>;
  confidence?: number | null;
  created_at: string;
};

export type CareAction = {
  id: string;
  kind: string;
  title: string;
  reason?: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  due_at?: string | null;
  status: "open" | "done" | "dismissed" | "snoozed";
  source: "manual" | "ai" | "weather" | "sensor" | "season" | "scan";
  confidence?: number | null;
  garden_id: string;
  zone_id?: string | null;
  plant_id?: string | null;
  observation_id?: string | null;
  payload?: Json;
};

export type GrowthSnapshot = {
  plant_id: string | null;
  observation_id: string | null;
  stage?: string | null;
  vigor?: string | null;
  estimated_height_cm?: number | null;
  flowering?: boolean | null;
  fruiting?: boolean | null;
  harvest_readiness?: string | null;
  anomaly_flags: string[];
};

export type NormalizedScanResult = {
  title: string;
  severity: "low" | "medium" | "high";
  confidence: number | null;
  symptoms: string[];
  causes: string[];
  treatment: string;
  prevention: string | null;
  raw: Record<string, unknown>;
};

export function clampNormalizedPoint(x: number, y: number) {
  return {
    normalized_x: Math.max(0.03, Math.min(0.97, x)),
    normalized_y: Math.max(0.03, Math.min(0.97, y)),
  };
}

export function mapAnchor(
  gardenId: string,
  zoneId?: string | null,
  plantId?: string | null,
  x = 0.5,
  y = 0.5,
  accuracy: MapAnchor["accuracy"] = "manual",
): MapAnchor {
  const point = clampNormalizedPoint(x, y);
  return {
    garden_id: gardenId,
    zone_id: zoneId ?? null,
    plant_id: plantId ?? null,
    normalized_x: point.normalized_x,
    normalized_y: point.normalized_y,
    accuracy,
  };
}

export function asNumberConfidence(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(1, value));
  }
  if (value === "high") return 0.86;
  if (value === "medium") return 0.62;
  if (value === "low") return 0.34;
  return null;
}

export function normalizeScanResult(raw: Record<string, unknown>): NormalizedScanResult {
  const severity = raw.severity === "high" || raw.severity === "medium" || raw.severity === "low"
    ? raw.severity
    : "low";
  return {
    title: String(raw.diagnosis || raw.name_da || raw.summary || "Observation gemt"),
    severity,
    confidence: asNumberConfidence(raw.confidence),
    symptoms: Array.isArray(raw.symptoms) ? raw.symptoms.map(String) : [],
    causes: Array.isArray(raw.causes) ? raw.causes.map(String) : [],
    treatment: String(raw.treatment || raw.care_tip || raw.next_action || ""),
    prevention: raw.prevention ? String(raw.prevention) : null,
    raw,
  };
}
