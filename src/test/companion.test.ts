import { describe, expect, it } from "vitest";
import { actionFromScan, actionsFromBedScan, actionsFromGrowth, generateDeviceActions, generateWeatherActions } from "@/lib/companionActions";
import { computeHealthScore } from "@/lib/companionHealth";
import { generateSeasonActions, generateZoneInsights } from "@/lib/companionInsights";
import { buildTimeline, problemResolutionState } from "@/lib/companionTimeline";
import { clampNormalizedPoint, mapAnchor, normalizeScanResult, readCompanionPreferences } from "@/lib/companionTypes";

describe("companion map anchors", () => {
  it("clamps normalized positions away from unusable edges", () => {
    expect(clampNormalizedPoint(-1, 2)).toEqual({ normalized_x: 0.03, normalized_y: 0.97 });
  });

  it("creates a manual map anchor for garden observations", () => {
    expect(mapAnchor("garden-1", "zone-1", "plant-1", 0.25, 0.75)).toMatchObject({
      garden_id: "garden-1",
      zone_id: "zone-1",
      plant_id: "plant-1",
      normalized_x: 0.25,
      normalized_y: 0.75,
      accuracy: "manual",
    });
  });
});

describe("companion scan normalization", () => {
  it("turns high severity diagnosis into an urgent care action", () => {
    const scan = normalizeScanResult({
      diagnosis: "Meldug i roser",
      severity: "high",
      confidence: 0.82,
      symptoms: ["hvid belægning"],
      causes: ["tæt beplantning"],
      treatment: "Fjern angrebne blade og luft ud i bedet.",
    });

    const action = actionFromScan("garden-1", scan, "obs-1", "zone-1", "plant-1");
    expect(action).toMatchObject({
      kind: "diagnose",
      priority: "urgent",
      source: "scan",
      garden_id: "garden-1",
      observation_id: "obs-1",
    });
  });

  it("does not create tasks for low risk scans", () => {
    const scan = normalizeScanResult({ diagnosis: "Ser sund ud", severity: "low", treatment: "Hold øje." });
    expect(actionFromScan("garden-1", scan, "obs-1")).toBeNull();
  });

  it("turns bed scan task suggestions into mapped care actions", () => {
    const actions = actionsFromBedScan("garden-1", {
      confidence: 0.74,
      task_suggestions: [
        { title: "Lug ukrudt i tomatbedet", priority: "medium", reason: "Bedet er tæt ved kanten." },
      ],
    }, "obs-2", "zone-1");

    expect(actions[0]).toMatchObject({
      kind: "bed_followup",
      priority: "high",
      source: "scan",
      zone_id: "zone-1",
      observation_id: "obs-2",
    });
  });

  it("creates growth actions for anomalies and harvest readiness", () => {
    const actions = actionsFromGrowth("garden-1", {
      confidence: 0.7,
      anomaly_flags: ["gulning"],
      harvest_readiness: "klar",
    }, "obs-3", "zone-1", "plant-1");

    expect(actions.map((action) => action.kind)).toEqual(expect.arrayContaining(["growth_anomaly", "harvest_ready"]));
  });
});

describe("companion deterministic suggestions", () => {
  it("creates heat watch actions for sunny zones during heat streaks", () => {
    const actions = generateWeatherActions(
      "garden-1",
      [{ id: "z1", name: "Tomatbed", sun_exposure: "sun" }],
      [
        { date: "2026-07-01", precip_mm: 0, temp_max: 29, temp_min: 15, et0: 4 },
        { date: "2026-07-02", precip_mm: 0, temp_max: 30, temp_min: 16, et0: 4 },
        { date: "2026-07-03", precip_mm: 0, temp_max: 24, temp_min: 14, et0: 3 },
      ],
    );
    expect(actions.some((a) => a.kind === "heat_watch" && a.zone_id === "z1")).toBe(true);
  });

  it("creates sensor dry and battery actions from device readings", () => {
    const actions = generateDeviceActions("garden-1", [
      { id: "d1", name: "Sensor 1", kind: "sensor", status: "online", battery: 18, metadata: { zone_id: "z1", moisture_pct: 22 } },
    ]);
    expect(actions.map((a) => a.kind)).toEqual(expect.arrayContaining(["device_battery", "sensor_dry"]));
  });
});

describe("companion preferences", () => {
  it("normalizes automation and onboarding preferences", () => {
    expect(readCompanionPreferences({
      goals: ["Høst"],
      weekly_time_budget_minutes: 999,
      automation_mode: "device_autopilot",
      notification_preference: "urgent",
      device_autopilot_confirmed: true,
    })).toMatchObject({
      goals: ["Høst"],
      weekly_time_budget_minutes: 720,
      automation_mode: "device_autopilot",
      notification_preference: "urgent",
      device_autopilot_confirmed: true,
    });
  });
});

describe("companion health scoring", () => {
  it("penalizes disease, dry sensors, urgent tasks, and weather stress", () => {
    const score = computeHealthScore({
      zones: [{ id: "z1", name: "Tomatbed", sun_exposure: "sun" }],
      tasks: [{ done: false, priority: "urgent", zone_id: "z1" }],
      devices: [{ kind: "sensor", status: "online", battery: 80, metadata: { zone_id: "z1", moisture_pct: 20 } }],
      healthLogs: [{ severity: "high", zone_id: "z1", created_at: "2026-05-19" }],
      forecasts: [{ date: "2026-05-19", precip_mm: 0, temp_max: 29, temp_min: 12, et0: 4 }],
      zoneId: "z1",
    });

    expect(score.status).not.toBe("good");
    expect(score.factors).toEqual(expect.arrayContaining(["akut sygdomsrisiko", "tør jord"]));
  });
});

describe("companion timeline", () => {
  it("merges and orders observations, growth, tasks, and health logs", () => {
    const events = buildTimeline({
      plantId: "p1",
      observations: [{ id: "o1", kind: "photo", caption: "Foto", image_url: null, created_at: "2026-05-18", plant_id: "p1" }],
      growthSnapshots: [{ id: "g1", stage: "blomstring", vigor: "stærk", created_at: "2026-05-19", plant_id: "p1" }],
      healthLogs: [{ id: "h1", diagnosis: "Meldug", severity: "medium", treatment: "Luft", created_at: "2026-05-17", plant_id: "p1" }],
      tasks: [{ id: "t1", title: "Tjek blade", kind: "diagnose", done: false, due_at: "2026-05-20", plant_id: "p1" }],
    });

    expect(events.map((event) => event.type)).toEqual(["task", "growth", "photo", "diagnosis"]);
  });

  it("tracks issue resolution from health logs and follow-up tasks", () => {
    expect(problemResolutionState(
      [{ id: "h1", severity: "medium", created_at: "2026-05-18", plant_id: "p1" }],
      [{ id: "t1", title: "Følg op", kind: "diagnose", done: false, plant_id: "p1" }],
      "p1",
    )).toBe("open");
    expect(problemResolutionState(
      [{ id: "h2", severity: "low", created_at: "2026-05-19", plant_id: "p1" }],
      [],
      "p1",
    )).toBe("resolved");
  });
});

describe("companion insights and season planning", () => {
  it("generates zone insights with explicit reasons", () => {
    const insights = generateZoneInsights({
      zone: { id: "z1", name: "Tomatbed", sun_exposure: "sun" },
      healthScore: { score: 58, status: "risk", factors: ["tør jord"], primary_risk: "tør jord", explanation: "Primært tør jord." },
      tasks: [{ title: "Vand", kind: "water", done: false, priority: "high", zone_id: "z1" }],
    });
    expect(insights[0]).toMatchObject({ action_kind: "zone_health_check", priority: "high" });
  });

  it("generates seasonal actions and avoids duplicates", () => {
    const actions = generateSeasonActions({
      gardenId: "garden-1",
      zones: [{ id: "z1", name: "Bed", type: "vegetable" }],
      plants: [{ id: "p1", zone_id: "z1", plant_slug: "tomat" }],
      catalogBySlug: { tomat: { slug: "tomat", name_da: "Tomat", harvest_months: [5] } },
      existingTasks: [{ title: "Tjek høst på Tomat", kind: "harvest", zone_id: "z1", done: false }],
      month: 5,
    });

    expect(actions.some((action) => action.title === "Tjek høst på Tomat")).toBe(false);
  });
});
