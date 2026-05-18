import type { Forecast } from "@/lib/wateringAI";
import type { CareAction, NormalizedScanResult } from "@/lib/companionTypes";

type ZoneLike = {
  id: string;
  name: string;
  type?: string | null;
  sun_exposure?: string | null;
  soil?: string | null;
};

type DeviceLike = {
  id: string;
  name: string;
  kind: string;
  status: string;
  battery: number | null;
  metadata?: Record<string, unknown> | null;
  zone_id?: string | null;
};

function metadataZoneId(device: DeviceLike) {
  const zoneId = device.metadata?.zone_id;
  return typeof zoneId === "string" ? zoneId : device.zone_id ?? null;
}

function metadataMoisture(device: DeviceLike) {
  const moisture = device.metadata?.moisture_pct;
  return typeof moisture === "number" ? moisture : null;
}

function dueInHours(hours: number) {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export function actionFromScan(
  gardenId: string,
  result: NormalizedScanResult,
  observationId: string,
  zoneId?: string | null,
  plantId?: string | null,
): Omit<CareAction, "id"> | null {
  if (result.severity === "low" || !result.treatment.trim()) return null;

  return {
    kind: "diagnose",
    title: result.severity === "high" ? `Akut: ${result.title}` : `Følg op: ${result.title}`,
    reason: result.treatment,
    priority: result.severity === "high" ? "urgent" : "high",
    due_at: result.severity === "high" ? dueInHours(6) : dueInHours(24),
    status: "open",
    source: "scan",
    confidence: result.confidence,
    garden_id: gardenId,
    zone_id: zoneId ?? null,
    plant_id: plantId ?? null,
    observation_id: observationId,
    payload: {
      symptoms: result.symptoms,
      causes: result.causes,
      prevention: result.prevention,
      severity: result.severity,
    },
  };
}

export function generateWeatherActions(
  gardenId: string,
  zones: ZoneLike[],
  forecasts: Forecast[],
): Omit<CareAction, "id">[] {
  const today = forecasts[0];
  if (!today) return [];
  const actions: Omit<CareAction, "id">[] = [];

  if ((today.temp_min ?? 10) <= 2) {
    actions.push({
      kind: "frost_watch",
      title: "Beskyt frostfølsomme planter i nat",
      reason: `Nattetemperaturen nærmer sig ${Math.round(today.temp_min ?? 0)} °C.`,
      priority: "high",
      due_at: dueInHours(8),
      status: "open",
      source: "weather",
      confidence: 0.8,
      garden_id: gardenId,
      payload: { temp_min: today.temp_min },
    });
  }

  const hotDays = forecasts.slice(0, 3).filter((f) => (f.temp_max ?? 0) >= 28).length;
  if (hotDays >= 2) {
    for (const zone of zones.filter((z) => z.sun_exposure === "sun").slice(0, 4)) {
      actions.push({
        kind: "heat_watch",
        title: `Tjek varme-stress i ${zone.name}`,
        reason: "Flere varme dage i træk kan give slappe blade og hurtig udtørring.",
        priority: "high",
        due_at: dueInHours(18),
        status: "open",
        source: "weather",
        confidence: 0.72,
        garden_id: gardenId,
        zone_id: zone.id,
        payload: { hot_days: hotDays },
      });
    }
  }

  if ((today.precip_mm ?? 0) >= 8) {
    actions.push({
      kind: "rain_check",
      title: "Tjek dræn og snegle efter regn",
      reason: `${today.precip_mm.toFixed(1)} mm regn kan give våd jord og sneglepres i tætte bede.`,
      priority: "normal",
      due_at: dueInHours(30),
      status: "open",
      source: "weather",
      confidence: 0.66,
      garden_id: gardenId,
      payload: { precip_mm: today.precip_mm },
    });
  }

  return actions;
}

export function generateDeviceActions(
  gardenId: string,
  devices: DeviceLike[],
): Omit<CareAction, "id">[] {
  return devices.flatMap((device) => {
    const actions: Omit<CareAction, "id">[] = [];
    if (typeof device.battery === "number" && device.battery <= 20) {
      actions.push({
        kind: "device_battery",
        title: `Skift batteri på ${device.name}`,
        reason: `Batteriet er nede på ${device.battery}%.`,
        priority: "normal",
        due_at: dueInHours(48),
        status: "open",
        source: "sensor",
        confidence: 0.95,
        garden_id: gardenId,
        zone_id: metadataZoneId(device),
        payload: { device_id: device.id, battery: device.battery },
      });
    }
    const moisture = metadataMoisture(device);
    if (device.kind === "sensor" && moisture !== null && moisture < 28) {
      actions.push({
        kind: "sensor_dry",
        title: `${device.name} melder tør jord`,
        reason: `Jordfugt er ${Math.round(moisture)}%. Bekræft med fingeren før vanding.`,
        priority: "high",
        due_at: dueInHours(4),
        status: "open",
        source: "sensor",
        confidence: 0.78,
        garden_id: gardenId,
        zone_id: metadataZoneId(device),
        payload: { device_id: device.id, moisture_pct: moisture },
      });
    }
    return actions;
  });
}
