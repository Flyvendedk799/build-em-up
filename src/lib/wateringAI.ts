// Watering decision engine + volume math + week computation.
// Pure helpers, no React.

export type Forecast = {
  date: string;            // YYYY-MM-DD
  precip_mm: number;
  temp_max: number;
  et0: number;             // mm/day FAO ET0 (Open-Meteo)
  wind_max?: number;
};

export type Zone = {
  id: string;
  name: string;
  type: string;            // lawn|bed|greenhouse|terrace|pond|tree
  area_m2: number | null;
  sun_exposure?: string | null; // sun|part|shade
  soil?: string | null;         // sand|loam|clay
};

export type Schedule = {
  id: string;
  zone_id: string;
  name: string;
  weekday_mask: number;
  start_time: string;
  duration_min: number;
  enabled: boolean;
  ai_adjusted: boolean;
};

export type Decision = {
  action: "water" | "skip" | "reduce" | "boost";
  reason: string;
  effectiveMin: number;       // adjusted duration
  mmExpected: number;         // forecast precip on the day
  confidence: "high" | "medium" | "low";
};

// L per m² per session by zone type
const VOL_COEFF: Record<string, number> = {
  lawn: 4,
  bed: 6,
  greenhouse: 8,
  terrace: 1,
  pond: 0,
  tree: 8,
};

// soil-aware skip threshold (mm forecast precip)
const SOIL_SKIP_MM: Record<string, number> = {
  sand: 5,
  loam: 4,
  clay: 3,
};

export function maskHas(mask: number, day: number) {
  return (mask & (1 << day)) !== 0;
}
export function maskToggle(mask: number, day: number) {
  return mask ^ (1 << day);
}

/** Day-of-week 0=Mon..6=Sun. */
export function dowMon0(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Estimate liters delivered for a session of `min` minutes on a zone. */
export function litersForSession(zone: Zone, min: number): number {
  const base = VOL_COEFF[zone.type] ?? 4;
  // Assume schedule duration of 15 min ≈ 1× session volume; scale linearly.
  const factor = min / 15;
  return Math.round((zone.area_m2 ?? 0) * base * factor);
}

/** Given a schedule, return the next N occurrences as Date objects. */
export function upcomingOccurrences(s: Schedule, days = 7): Date[] {
  const out: Date[] = [];
  const now = new Date();
  const [h, m] = s.start_time.split(":").map(Number);
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(h, m, 0, 0);
    if (maskHas(s.weekday_mask, dowMon0(d)) && d.getTime() >= now.getTime() - 60_000) {
      out.push(d);
    }
  }
  return out;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Decide what should happen for a planned occurrence. */
export function decide(
  s: Schedule,
  zone: Zone,
  occ: Date,
  forecasts: Forecast[],
  recentMm48h: number,
): Decision {
  const key = isoDate(occ);
  const fc = forecasts.find((f) => f.date === key);
  const precip = fc?.precip_mm ?? 0;
  const temp = fc?.temp_max ?? 18;
  const et0 = fc?.et0 ?? 3;

  if (!s.enabled) {
    return { action: "skip", reason: "Pause", effectiveMin: 0, mmExpected: precip, confidence: "high" };
  }

  if (!s.ai_adjusted) {
    return { action: "water", reason: "Manuel timer", effectiveMin: s.duration_min, mmExpected: precip, confidence: "high" };
  }

  const soil = (zone.soil ?? "loam").toLowerCase();
  const skipMm = SOIL_SKIP_MM[soil] ?? 4;

  if (recentMm48h > 10) {
    return { action: "skip", reason: `Jorden er våd · ${recentMm48h.toFixed(1)} mm sidste 48 t`, effectiveMin: 0, mmExpected: precip, confidence: "high" };
  }
  if (precip >= skipMm) {
    return { action: "skip", reason: `Springer over · ${precip.toFixed(1)} mm regn ventet`, effectiveMin: 0, mmExpected: precip, confidence: "high" };
  }

  let min = s.duration_min;
  let action: Decision["action"] = "water";
  let reason = `Vand som planlagt · ${min} min`;

  const fullSun = (zone.sun_exposure ?? "sun").toLowerCase().startsWith("sun");
  if (temp > 28 && fullSun) {
    min = Math.round(min * 1.2);
    action = "boost";
    reason = `Øger til ${min} min · varme ${Math.round(temp)} °C`;
  } else if (et0 < 1.2) {
    min = Math.max(5, Math.round(min * 0.75));
    action = "reduce";
    reason = `Sænker til ${min} min · lav fordampning`;
  }

  return { action, reason, effectiveMin: min, mmExpected: precip, confidence: "medium" };
}

/** Compute weekly water summary across all zones+schedules. */
export function weekSummary(
  schedules: Schedule[],
  zones: Zone[],
  forecasts: Forecast[],
) {
  let plannedL = 0;
  let savedL = 0;
  let waterCount = 0;
  let skipCount = 0;
  const last48Mm = forecasts.slice(0, 2).reduce((a, b) => a + b.precip_mm, 0); // crude proxy

  for (const s of schedules) {
    const zone = zones.find((z) => z.id === s.zone_id);
    if (!zone) continue;
    const occs = upcomingOccurrences(s, 7);
    for (const o of occs) {
      const d = decide(s, zone, o, forecasts, last48Mm);
      if (d.action === "skip") {
        skipCount++;
        savedL += litersForSession(zone, s.duration_min);
      } else {
        waterCount++;
        plannedL += litersForSession(zone, d.effectiveMin);
      }
    }
  }
  return { plannedL, savedL, waterCount, skipCount };
}

const FC_CACHE_KEY = "watering.forecast.v1";

export function loadCachedForecast(lat: number, lng: number): Forecast[] | null {
  try {
    const raw = sessionStorage.getItem(FC_CACHE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (j.lat === lat && j.lng === lng && Date.now() - j.t < 6 * 3600_000) return j.data as Forecast[];
  } catch {}
  return null;
}
export function saveCachedForecast(lat: number, lng: number, data: Forecast[]) {
  try { sessionStorage.setItem(FC_CACHE_KEY, JSON.stringify({ lat, lng, t: Date.now(), data })); } catch {}
}

export async function fetchForecast(lat: number, lng: number): Promise<Forecast[]> {
  const cached = loadCachedForecast(lat, lng);
  if (cached) return cached;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,temperature_2m_max,et0_fao_evapotranspiration,wind_speed_10m_max&timezone=Europe%2FCopenhagen&forecast_days=14`;
  const j = await fetch(url).then((r) => r.json());
  const dates: string[] = j?.daily?.time ?? [];
  const out: Forecast[] = dates.map((d, i) => ({
    date: d,
    precip_mm: j.daily.precipitation_sum?.[i] ?? 0,
    temp_max: j.daily.temperature_2m_max?.[i] ?? 18,
    et0: j.daily.et0_fao_evapotranspiration?.[i] ?? 3,
    wind_max: j.daily.wind_speed_10m_max?.[i] ?? 0,
  }));
  saveCachedForecast(lat, lng, out);
  return out;
}
