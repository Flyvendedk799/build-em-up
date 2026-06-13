import { useEffect, useMemo, useRef, useState } from "react";
import "./WildlifeHabitat3D.css";

/**
 * WildlifeHabitat3D — an embeddable, procedural habitat diorama for the Dyreliv
 * page. Painterly faux-3D rendered on a 2D canvas (no WebGL / Three.js, no model
 * downloads, no network). Five modes highlight different wildlife groups and
 * animate matching creatures (bees, birds, hedgehog, dragonfly + frog).
 *
 * Integration: map the Dyreliv profile into the `habitats` prop, e.g.
 *
 *   <WildlifeHabitat3D
 *     score={profile.score}
 *     habitats={mappedHabitats}
 *     mode={mode}
 *     selectedHabitatId={selectedId}
 *     onModeChange={setMode}
 *     onSelectHabitat={setSelectedId}
 *   />
 */

export type WildlifeHabitat3DMode = "overview" | "pollinators" | "birds" | "smallAnimals" | "waterLife";

export type WildlifeHabitatKind =
  | "flowers" | "shrubs" | "trees" | "water" | "deadwood" | "stone" | "leafLitter" | "corridor";

export type WildlifeHabitatStrength = "missing" | "weak" | "good" | "strong";

export type WildlifeSpecies =
  | "wildBees" | "butterflies" | "birds" | "hedgehogs" | "frogs" | "beneficialInsects";

export type WildlifeHabitat = {
  id: string;
  name: string;
  kind: WildlifeHabitatKind;
  strength: WildlifeHabitatStrength;
  supports: WildlifeSpecies[];
  action?: { title: string; impact: number; plants?: string[] };
};

export type WildlifeHabitat3DProps = {
  score: number;
  mode?: WildlifeHabitat3DMode;
  onModeChange?: (mode: WildlifeHabitat3DMode) => void;
  habitats?: WildlifeHabitat[];
  selectedHabitatId?: string | null;
  onSelectHabitat?: (id: string) => void;
};

// ─── Static data ────────────────────────────────────────────────────────────

const DEFAULT_HABITATS: WildlifeHabitat[] = [
  { id: "h1", name: "Blomstereng", kind: "flowers", strength: "good", supports: ["wildBees", "butterflies", "beneficialInsects"], action: { title: "Udbyg med vilde blomster", impact: 12, plants: ["Kommen", "Røllike", "Hvidkløver"] } },
  { id: "h2", name: "Bærbusk", kind: "shrubs", strength: "strong", supports: ["birds", "wildBees", "butterflies"], action: { title: "Plant solbær og hyld", impact: 8, plants: ["Solbær", "Hyld", "Tørst"] } },
  { id: "h3", name: "Gammelt æbletræ", kind: "trees", strength: "good", supports: ["birds", "wildBees", "beneficialInsects"], action: { title: "Bevar gammel bark", impact: 6 } },
  { id: "h4", name: "Regnvandsskål", kind: "water", strength: "weak", supports: ["frogs", "wildBees", "butterflies"], action: { title: "Tilføj vandbeholder", impact: 14, plants: ["Vandmynte", "Åkande"] } },
  { id: "h5", name: "Brændestabbe", kind: "deadwood", strength: "weak", supports: ["hedgehogs", "beneficialInsects", "birds"], action: { title: "Lad stamme ligge", impact: 10 } },
  { id: "h6", name: "Stenhøj", kind: "stone", strength: "missing", supports: ["hedgehogs", "frogs", "beneficialInsects"], action: { title: "Læg sten og grus", impact: 9 } },
  { id: "h7", name: "Løvbunke", kind: "leafLitter", strength: "weak", supports: ["hedgehogs", "beneficialInsects", "frogs"], action: { title: "Gem efterårsløv", impact: 7 } },
  { id: "h8", name: "Pindsvinekorridor", kind: "corridor", strength: "missing", supports: ["hedgehogs"], action: { title: "Lav hul i hæk", impact: 11 } },
];

type ZoneRect = { cx: number; cy: number; rw: number; rh: number };
const ZONE_POS: Record<WildlifeHabitatKind, ZoneRect> = {
  flowers: { cx: 0.44, cy: 0.618, rw: 0.16, rh: 0.078 },
  shrubs: { cx: 0.695, cy: 0.428, rw: 0.118, rh: 0.098 },
  trees: { cx: 0.155, cy: 0.4, rw: 0.092, rh: 0.162 },
  water: { cx: 0.715, cy: 0.66, rw: 0.104, rh: 0.062 },
  deadwood: { cx: 0.218, cy: 0.7, rw: 0.09, rh: 0.056 },
  stone: { cx: 0.82, cy: 0.718, rw: 0.07, rh: 0.044 },
  leafLitter: { cx: 0.09, cy: 0.756, rw: 0.08, rh: 0.05 },
  corridor: { cx: 0.49, cy: 0.88, rw: 0.26, rh: 0.028 },
};

const MODE_SPECIES: Record<WildlifeHabitat3DMode, WildlifeSpecies[] | null> = {
  overview: null,
  pollinators: ["wildBees", "butterflies", "beneficialInsects"],
  birds: ["birds"],
  smallAnimals: ["hedgehogs"],
  waterLife: ["frogs"],
};

const SPECIES_NAMES: Record<WildlifeSpecies, string> = {
  wildBees: "Vilde bier", butterflies: "Sommerfugle", birds: "Fugle",
  hedgehogs: "Pindsvin", frogs: "Frøer", beneficialInsects: "Nyttedyr",
};

const STRENGTH_COLOR: Record<WildlifeHabitatStrength, string> = {
  missing: "#B83818", weak: "#B87018", good: "#489018", strong: "#287818",
};
const STRENGTH_LABEL: Record<WildlifeHabitatStrength, string> = {
  missing: "Mangler", weak: "Svag", good: "God", strong: "Stærk",
};

const MODE_LIST: { id: WildlifeHabitat3DMode; label: string }[] = [
  { id: "overview", label: "Overblik" },
  { id: "pollinators", label: "Bestøvere" },
  { id: "birds", label: "Fugle" },
  { id: "smallAnimals", label: "Smådyr" },
  { id: "waterLife", label: "Vandliv" },
];

// ─── Drawing primitives ───────────────────────────────────────────────────────

type Ctx = CanvasRenderingContext2D;
type Perf = { bees: number; trailDots: number; ripples: number };
type Env = {
  mode: WildlifeHabitat3DMode;
  selId: string | null;
  hovId: string | null;
  t: number;
  intro: number;
  mx: number;
  my: number;
  habs: WildlifeHabitat[];
  score: number;
  perf: Perf;
};

const ease = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
const ph = (intro: number, a: number, b: number) => ease(Math.max(0, Math.min(1, (intro - a) / Math.max(0.001, b - a))));

function isActive(hab: WildlifeHabitat, mode: WildlifeHabitat3DMode) {
  const ms = MODE_SPECIES[mode];
  return !ms || hab.supports.some((s) => ms.includes(s));
}

function dk(hex: string, amt: number) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - amt))},${Math.round(g * (1 - amt))},${Math.round(b * (1 - amt))})`;
}

function drawSky(ctx: Ctx, W: number, H: number, intro: number) {
  const al = ph(intro, 0, 0.14);
  ctx.save(); ctx.globalAlpha = al;
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.45);
  g.addColorStop(0, "#FAF0CA"); g.addColorStop(0.55, "#F4E6A4"); g.addColorStop(1, "#E8D47C");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createLinearGradient(0, H * 0.36, 0, H);
  g2.addColorStop(0, "#BED05E"); g2.addColorStop(0.16, "#4A7820"); g2.addColorStop(0.46, "#2C5010"); g2.addColorStop(1, "#182C08");
  ctx.fillStyle = g2; ctx.fillRect(0, H * 0.36, W, H * 0.64);
  const sg = ctx.createRadialGradient(W * 0.13, H * 0.08, 8, W * 0.13, H * 0.08, W * 0.32);
  sg.addColorStop(0, "rgba(255,220,95,0.58)"); sg.addColorStop(0.38, "rgba(255,200,75,0.18)"); sg.addColorStop(1, "rgba(255,200,75,0)");
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H * 0.46);
  ctx.globalAlpha = al * 0.045;
  for (let i = 0; i < 7; i++) {
    const a = i * 0.1 - 0.34;
    ctx.beginPath(); ctx.moveTo(W * 0.13, H * 0.08);
    ctx.lineTo(W * 0.13 + Math.cos(a) * W * 1.3, H * 0.08 + Math.sin(a) * H * 1.3);
    ctx.lineTo(W * 0.13 + Math.cos(a + 0.045) * W * 1.3, H * 0.08 + Math.sin(a + 0.045) * H * 1.3);
    ctx.fillStyle = "#FFD050"; ctx.fill();
  }
  ctx.restore();
}

function drawFarTrees(ctx: Ctx, W: number, H: number, intro: number) {
  const al = ph(intro, 0.07, 0.3);
  ctx.save(); ctx.globalAlpha = al;
  const ts = [
    { x: 0.05, y: 0.262, rx: 0.05, ry: 0.092, c: "#263C10" },
    { x: 0.24, y: 0.24, rx: 0.038, ry: 0.078, c: "#304618" },
    { x: 0.49, y: 0.25, rx: 0.035, ry: 0.07, c: "#2C4414" },
    { x: 0.61, y: 0.236, rx: 0.043, ry: 0.082, c: "#243A10" },
    { x: 0.83, y: 0.252, rx: 0.044, ry: 0.084, c: "#2C4014" },
    { x: 0.93, y: 0.232, rx: 0.036, ry: 0.074, c: "#283C10" },
  ];
  ts.forEach((t) => {
    ctx.fillStyle = t.c;
    ctx.beginPath(); ctx.ellipse(W * t.x, H * t.y, W * t.rx * 0.88, H * t.ry * 0.68, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * (t.x - t.rx * 0.58), H * (t.y + t.ry * 0.28), W * t.rx * 0.58, H * t.ry * 0.53, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * (t.x + t.rx * 0.52), H * (t.y + t.ry * 0.18), W * t.rx * 0.48, H * t.ry * 0.46, 0, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

function drawGround(ctx: Ctx, W: number, H: number, intro: number) {
  const al = ph(intro, 0.14, 0.4);
  ctx.save(); ctx.globalAlpha = al;
  ctx.beginPath(); ctx.moveTo(0, H * 0.38);
  for (let i = 0; i <= 16; i++) {
    const x = (i / 16) * W, w = Math.sin(i * 0.88 + 1.9) * H * 0.022 + Math.cos(i * 1.6) * H * 0.013;
    ctx.lineTo(x, H * 0.38 + w);
  }
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  const g = ctx.createLinearGradient(0, H * 0.38, 0, H);
  g.addColorStop(0, "#68902E"); g.addColorStop(0.12, "#3E6420"); g.addColorStop(0.4, "#2A4E18"); g.addColorStop(1, "#182A08");
  ctx.fillStyle = g; ctx.fill();
  ctx.globalAlpha = al * 0.06;
  for (let k = 0; k < 28; k++) {
    ctx.beginPath(); ctx.arc((W * ((k * 137 + 29) % 100)) / 100, H * 0.45 + H * 0.5 * (((k * 97 + 43) % 100) / 100), 2.2, 0, Math.PI * 2);
    ctx.fillStyle = "#3A5E18"; ctx.fill();
  }
  ctx.restore();
}

// ── Per-habitat painters ──

function dFlowers(ctx: Ctx, rw: number, rh: number, str: WildlifeHabitatStrength, act: boolean, hi: boolean, t: number) {
  const n = { strong: 24, good: 16, weak: 9, missing: 4 }[str] ?? 9;
  const pal = act ? ["#EED030", "#E85518", "#CC35A0", "#7C38CC", "#EEF0DC", "#E89E28"] : ["#A89020", "#A03C10", "#882678", "#502888", "#A4A890", "#A07018"];
  ctx.beginPath(); ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
  ctx.fillStyle = act ? "#4C8828" : "#3A6820"; ctx.fill();
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, r = rw * (0.36 + (k % 3) * 0.19);
    const gx = Math.cos(a) * r * 0.87, gy = Math.sin(a) * r * 0.44;
    const sw = Math.sin(t * 1.5 + k) * 1.6;
    ctx.strokeStyle = act ? "#5CA030" : "#426820"; ctx.lineWidth = 1.3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + sw * 0.38, gy - 7 - sw * 0.18); ctx.stroke();
  }
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + k * 0.618;
    const r = rw * (0.12 + (k % 4) * 0.2);
    const fx = Math.cos(a) * r * 0.9 + Math.sin(k * 1.7) * rw * 0.06;
    const fy = Math.sin(a) * r * 0.46 + Math.cos(k * 2.1) * rh * 0.1;
    const sw = Math.sin(t * 1.4 + k * 0.9) * 2.1;
    ctx.save(); ctx.translate(fx + sw * 0.28, fy + sw * 0.1);
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(Math.cos(pa) * 3.5, Math.sin(pa) * 3.5, 2.9, 2.0, pa, 0, Math.PI * 2);
      ctx.fillStyle = pal[k % pal.length]; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, 2.3, 0, Math.PI * 2);
    ctx.fillStyle = "#F8DC35"; ctx.fill();
    ctx.restore();
  }
  if (hi) {
    const bg = ctx.createRadialGradient(0, 0, rw * 0.1, 0, 0, rw * 1.1);
    bg.addColorStop(0, "rgba(240,218,48,0.24)"); bg.addColorStop(1, "rgba(240,218,48,0)");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, rw * 1.12, rh * 1.12, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function dShrubs(ctx: Ctx, rw: number, rh: number, str: WildlifeHabitatStrength, act: boolean, hi: boolean, t: number) {
  const sw = Math.sin(t * 0.62) * 1.5;
  const bumps = [
    { dx: -0.46, dy: 0.08, rx: 0.54, ry: 0.66, c: "#3A7220" },
    { dx: 0.28, dy: 0.04, rx: 0.46, ry: 0.6, c: "#2E6018" },
    { dx: -0.07, dy: -0.22, rx: 0.5, ry: 0.58, c: "#447828" },
    { dx: 0.62, dy: 0.14, rx: 0.33, ry: 0.49, c: "#488030" },
    { dx: -0.63, dy: 0.24, rx: 0.35, ry: 0.45, c: "#325A1C" },
  ];
  bumps.forEach((b) => {
    ctx.beginPath(); ctx.ellipse(b.dx * rw + sw * 0.18, b.dy * rh, b.rx * rw, b.ry * rh, 0, 0, Math.PI * 2);
    ctx.fillStyle = act ? b.c : dk(b.c, 0.28); ctx.fill();
  });
  const bn = { strong: 16, good: 10, weak: 6, missing: 3 }[str] ?? 6;
  for (let k = 0; k < bn; k++) {
    const a = (k / bn) * Math.PI * 2 + 1.28;
    const r = rw * (0.28 + (k % 3) * 0.24);
    const bx = Math.cos(a) * r * 0.9, by = Math.sin(a) * r * 0.5;
    ctx.beginPath(); ctx.arc(bx, by, 3.8, 0, Math.PI * 2);
    ctx.fillStyle = hi ? "#C82828" : "#882020"; ctx.fill();
    ctx.beginPath(); ctx.arc(bx - 1.1, by - 1.1, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,200,178,0.52)"; ctx.fill();
  }
  if (hi) {
    const bg = ctx.createRadialGradient(0, 0, rw * 0.1, 0, 0, rw * 1.1);
    bg.addColorStop(0, "rgba(176,58,38,0.20)"); bg.addColorStop(1, "rgba(176,58,38,0)");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, rw * 1.1, rh * 1.1, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function dTree(ctx: Ctx, rw: number, rh: number, _str: WildlifeHabitatStrength, act: boolean, hi: boolean, t: number) {
  const sw = Math.sin(t * 0.66) * 2.6;
  const tw = 13;
  ctx.beginPath(); ctx.ellipse(tw, rh * 0.12, rw * 0.65, rh * 0.18, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(16,28,8,0.20)"; ctx.fill();
  const tg = ctx.createLinearGradient(-tw * 0.5, -rh * 1.18, tw * 0.5, 0);
  tg.addColorStop(0, "#4A3018"); tg.addColorStop(0.52, "#5C3C1E"); tg.addColorStop(1, "#284010");
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.rect(-tw * 0.5, -rh * 1.18, tw, rh * 1.18); ctx.fill();
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = "rgba(18,8,2,0.18)"; ctx.lineWidth = 0.9; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-3.5 + k * 3.5, -rh * 1.12); ctx.lineTo(-4 + k * 3.5, -rh * 0.18); ctx.stroke();
  }
  const can = [
    { dx: -0.24, dy: -1.02, rx: 0.54, ry: 0.46, c: "#2C5A18" },
    { dx: 0.28, dy: -1.22, rx: 0.46, ry: 0.42, c: "#384E20" },
    { dx: 0.04, dy: -1.38, rx: 0.44, ry: 0.38, c: "#3C6224" },
    { dx: 0.18, dy: -0.84, rx: 0.38, ry: 0.32, c: "#2A4E14" },
  ];
  can.forEach((c) => {
    ctx.beginPath(); ctx.ellipse(c.dx * rw + sw * 0.38, c.dy * rh, c.rx * rw, c.ry * rh, 0, 0, Math.PI * 2);
    ctx.fillStyle = act ? c.c : dk(c.c, 0.22); ctx.fill();
  });
  if (act || hi) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + t * 0.4;
      const lx = Math.cos(a) * rw * 0.34 + sw * 0.28, ly = -rh * 1.05 + Math.sin(a) * rh * 0.36;
      ctx.save(); ctx.globalAlpha *= 0.58;
      ctx.beginPath(); ctx.arc(lx, ly, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = "#78B040"; ctx.fill(); ctx.restore();
    }
  }
}

function dWater(ctx: Ctx, rw: number, rh: number, _str: WildlifeHabitatStrength, act: boolean, hi: boolean, t: number, ripples: number) {
  ctx.beginPath(); ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
  const wg = ctx.createRadialGradient(-rw * 0.22, -rh * 0.3, 2, 0, 0, rw);
  wg.addColorStop(0, act ? "#8AD0E2" : "#5A8898"); wg.addColorStop(0.55, act ? "#48A0C0" : "#3A6878"); wg.addColorStop(1, act ? "#2870A2" : "#1E4860");
  ctx.fillStyle = wg; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.beginPath(); ctx.ellipse(-rw * 0.22, -rh * 0.32, rw * 0.36, rh * 0.14, -0.38, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.34)"; ctx.fill(); ctx.restore();
  for (let k = 0; k < ripples; k++) {
    const phh = (t * 0.55 + k * 0.28) % 1;
    ctx.save(); ctx.globalAlpha = (1 - phh) * 0.55;
    ctx.beginPath(); ctx.ellipse(0, 0, phh * rw * 0.9, phh * rw * 0.43, 0, 0, Math.PI * 2);
    ctx.strokeStyle = act ? "#AADDFC" : "#7AAECC"; ctx.lineWidth = 2.0; ctx.stroke(); ctx.restore();
  }
  if (hi) {
    ctx.save(); ctx.translate(rw * 0.62, rh * 0.16);
    ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 3.8, 0, 0, Math.PI * 2); ctx.fillStyle = "#3A8830"; ctx.fill();
    ctx.fillStyle = "#102010";
    ctx.beginPath(); ctx.arc(-2.1, -1.5, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.1, -1.5, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}

function dDeadwood(ctx: Ctx, rw: number, rh: number, _str: WildlifeHabitatStrength, act: boolean, hi: boolean) {
  const lc = act ? "#7A5030" : "#5A3820";
  ctx.save(); ctx.rotate(-0.14);
  ctx.beginPath(); ctx.rect(-rw * 0.86, -rh * 0.22, rw * 1.72, rh * 0.44);
  const lg = ctx.createLinearGradient(0, -rh * 0.22, 0, rh * 0.22);
  lg.addColorStop(0, act ? "#9A6840" : "#6A4828"); lg.addColorStop(0.38, lc); lg.addColorStop(1, act ? "#5A3820" : "#3A2410");
  ctx.fillStyle = lg; ctx.fill();
  ctx.beginPath(); ctx.ellipse(-rw * 0.86, 0, rh * 0.44, rh * 0.44, 0, 0, Math.PI * 2);
  ctx.fillStyle = act ? "#8A5830" : "#5A3820"; ctx.fill();
  [0.28, 0.58, 0.84].forEach((r) => { ctx.beginPath(); ctx.arc(-rw * 0.86, 0, rh * 0.44 * r, 0, Math.PI * 2); ctx.strokeStyle = "rgba(22,10,2,0.13)"; ctx.lineWidth = 0.8; ctx.stroke(); });
  ctx.restore();
  ctx.save(); ctx.rotate(0.26);
  ctx.beginPath(); ctx.rect(-rw * 0.58, -rh * 0.18, rw * 1.16, rh * 0.36); ctx.fillStyle = act ? "#6A4828" : "#4A3018"; ctx.fill(); ctx.restore();
  for (let k = 0; k < 8; k++) {
    ctx.beginPath(); ctx.arc((((k * 131) % 80) - 40) / 40 * rw * 0.72, -rh * 0.14, 3.0, 0, Math.PI * 2);
    ctx.fillStyle = act ? "#4A7A20" : "#2A5010"; ctx.fill();
  }
  if (hi) {
    const bg = ctx.createRadialGradient(0, 0, rw * 0.1, 0, 0, rw * 1.16);
    bg.addColorStop(0, "rgba(198,118,38,0.24)"); bg.addColorStop(1, "rgba(198,118,38,0)");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, rw * 1.16, rh * 1.16, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function dStone(ctx: Ctx, rw: number, rh: number, _str: WildlifeHabitatStrength, act: boolean, _hi: boolean) {
  const sc = act ? "#9A9880" : "#6A6858";
  const stones = [
    [{ x: -0.58, y: -0.08 }, { x: 0.02, y: -0.62 }, { x: 0.62, y: -0.14 }, { x: 0.48, y: 0.38 }, { x: -0.38, y: 0.44 }],
    [{ x: -0.68, y: 0.12 }, { x: -0.18, y: -0.58 }, { x: 0.28, y: -0.48 }, { x: 0.18, y: 0.34 }, { x: -0.58, y: 0.48 }],
    [{ x: 0.22, y: -0.18 }, { x: 0.82, y: -0.48 }, { x: 1.08, y: 0.08 }, { x: 0.68, y: 0.52 }],
  ];
  const cols = [sc, act ? "#7A7862" : "#5A5846", act ? "#B8B698" : "#888870"];
  stones.forEach((pts, si) => {
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x * rw, p.y * rh) : ctx.moveTo(p.x * rw, p.y * rh)));
    ctx.closePath(); ctx.fillStyle = cols[si]; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.11)"; ctx.lineWidth = 0.8; ctx.stroke();
  });
}

function dLeaves(ctx: Ctx, rw: number, rh: number, str: WildlifeHabitatStrength, act: boolean, hi: boolean, t: number) {
  const n = { strong: 24, good: 18, weak: 12, missing: 7 }[str] ?? 12;
  const pal = act ? ["#C84820", "#D86828", "#B84810", "#E07838", "#D09040", "#8A4018"] : ["#884010", "#985018", "#782808", "#A86020", "#906030", "#5A2808"];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + k * 0.53, r = rw * (0.07 + (k % 5) * 0.17);
    const lx = Math.cos(a) * r * 0.92 + Math.sin(k * 1.7) * rw * 0.04, ly = Math.sin(a) * r * 0.52 + Math.cos(k * 2.1) * rh * 0.1;
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(((k * 41 + 7) / 360) * Math.PI * 2 + Math.sin(t * 0.8 + k) * 0.05);
    ctx.beginPath(); ctx.ellipse(0, 0, rw * 0.175, rw * 0.075, 0, 0, Math.PI * 2); ctx.fillStyle = pal[k % pal.length]; ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-rw * 0.13, 0); ctx.lineTo(rw * 0.13, 0); ctx.stroke();
    ctx.restore();
  }
  if (hi) {
    for (let k = 0; k < 5; k++) {
      const phh = (t * 1.2 + k * 0.22) % 1, px = (((k * 37) % 80) - 40) / 40 * rw * 0.62, py = -phh * rh * 0.9;
      ctx.save(); ctx.globalAlpha = (1 - phh) * 0.75;
      ctx.beginPath(); ctx.ellipse(px, py, rw * 0.085, rw * 0.042, 0, 0, Math.PI * 2); ctx.fillStyle = pal[k % pal.length]; ctx.fill(); ctx.restore();
    }
  }
}

function dCorridor(ctx: Ctx, rw: number, rh: number, _str: WildlifeHabitatStrength, act: boolean, hi: boolean, t: number) {
  ctx.beginPath(); ctx.rect(-rw, -rh * 1.2, rw * 2, rh * 2.4);
  const cg = ctx.createLinearGradient(0, -rh, 0, rh);
  cg.addColorStop(0, act ? "#3A6820" : "#2A4818"); cg.addColorStop(0.5, act ? "#4A7828" : "#344A20"); cg.addColorStop(1, act ? "#2E5418" : "#1E3810");
  ctx.fillStyle = cg; ctx.fill();
  const gap = rw * 0.09;
  ctx.fillStyle = act ? "#5A9030" : "#3A6020";
  ctx.beginPath(); ctx.rect(-gap, -rh * 1.4, gap * 2, rh * 2.8); ctx.fill();
  if (hi) {
    ctx.strokeStyle = "#68C838"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
    ctx.setLineDash([5, 4]); ctx.lineDashOffset = -(t * 18);
    ctx.beginPath(); ctx.moveTo(-rw * 0.72, 0); ctx.lineTo(rw * 0.72, 0); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(rw * 0.72, 0); ctx.lineTo(rw * 0.56, -rh * 0.55); ctx.lineTo(rw * 0.56, rh * 0.55); ctx.closePath();
    ctx.fillStyle = "#68C838"; ctx.fill();
  }
}

function drawHabitats(ctx: Ctx, W: number, H: number, env: Env) {
  const { mode, selId, hovId, intro, t, habs, perf } = env;
  const order: WildlifeHabitatKind[] = ["corridor", "leafLitter", "stone", "deadwood", "water", "flowers", "shrubs", "trees"];
  const dl: Record<WildlifeHabitatKind, number> = { trees: 0.22, shrubs: 0.28, flowers: 0.36, water: 0.4, deadwood: 0.44, stone: 0.47, leafLitter: 0.5, corridor: 0.54 };
  order.forEach((kind) => {
    const hab = habs.find((h) => h.kind === kind); if (!hab) return;
    const z = ZONE_POS[kind]; if (!z) return;
    const act = isActive(hab, mode), sel = hab.id === selId, hov = hab.id === hovId;
    const dim = !act && mode !== "overview";
    const d = dl[kind] ?? 0.3, phv = ph(intro, d, d + 0.26);
    const cx = W * z.cx, cy = H * z.cy, rw = W * z.rw, rh = H * z.rh;
    ctx.save(); ctx.globalAlpha = dim ? 0.22 * phv : phv; ctx.translate(cx, cy + (1 - phv) * 22);
    const hi = sel || hov;
    if (kind === "flowers") dFlowers(ctx, rw, rh, hab.strength, act, hi, t);
    if (kind === "shrubs") dShrubs(ctx, rw, rh, hab.strength, act, hi, t);
    if (kind === "trees") dTree(ctx, rw, rh, hab.strength, act, hi, t);
    if (kind === "water") dWater(ctx, rw, rh, hab.strength, act, hi, t, perf.ripples);
    if (kind === "deadwood") dDeadwood(ctx, rw, rh, hab.strength, act, hi);
    if (kind === "stone") dStone(ctx, rw, rh, hab.strength, act, hi);
    if (kind === "leafLitter") dLeaves(ctx, rw, rh, hab.strength, act, hi, t);
    if (kind === "corridor") dCorridor(ctx, rw, rh, hab.strength, act, hi, t);
    ctx.restore();
    if (hi && phv > 0.5) {
      ctx.save();
      ctx.beginPath(); ctx.ellipse(cx, cy, rw * 1.24, rh * 1.3, 0, 0, Math.PI * 2);
      ctx.strokeStyle = sel ? "#68C838" : "rgba(104,200,56,0.48)";
      ctx.lineWidth = sel ? 2.4 : 1.5;
      if (sel) { ctx.shadowColor = "#68C838"; ctx.shadowBlur = 16; }
      ctx.stroke(); ctx.shadowBlur = 0; ctx.restore();
    }
  });
}

// ── Creatures ──

function drawBees(ctx: Ctx, W: number, H: number, al: number, trail: boolean, t: number, perf: Perf) {
  const px = [0.44, 0.28, 0.155, 0.38, 0.695, 0.54, 0.44];
  const py = [0.618, 0.42, 0.4, 0.27, 0.428, 0.56, 0.618];
  const n = px.length - 1;
  if (trail) {
    for (let k = 0; k < perf.trailDots; k++) {
      const phh = (t * 0.34 - k * 0.018 + 2) % 1, seg = Math.min(Math.floor(phh * n), n - 1), t2 = phh * n - seg;
      const tx = W * (px[seg] + (px[seg + 1] - px[seg]) * t2), ty = H * (py[seg] + (py[seg + 1] - py[seg]) * t2);
      ctx.save(); ctx.globalAlpha = al * (1 - k / perf.trailDots) * 0.55;
      ctx.beginPath(); ctx.arc(tx, ty, 2.3, 0, Math.PI * 2); ctx.fillStyle = "#E8C030"; ctx.fill(); ctx.restore();
    }
  }
  for (let b = 0; b < perf.bees; b++) {
    const phh = (t * 0.34 + b * 0.334) % 1, seg = Math.min(Math.floor(phh * n), n - 1), t2 = phh * n - seg;
    const bx = W * (px[seg] + (px[seg + 1] - px[seg]) * t2 + Math.sin(t * 4 + b) * 0.016);
    const by = H * (py[seg] + (py[seg + 1] - py[seg]) * t2 + Math.cos(t * 3.2 + b) * 0.011);
    ctx.save(); ctx.globalAlpha = al; ctx.translate(bx, by);
    const wf = (t * 14 + b) % (Math.PI * 2);
    ctx.save(); ctx.globalAlpha *= 0.5; ctx.scale(1, Math.abs(Math.sin(wf)) * 0.72 + 0.28);
    ctx.fillStyle = "rgba(208,222,255,0.72)";
    ctx.beginPath(); ctx.ellipse(-4.5, 0, 5.2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4.5, 0, 5.2, 2.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.2, 0, 0, Math.PI * 2); ctx.fillStyle = "#D0A820"; ctx.fill();
    ctx.strokeStyle = "#1A1208"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-4.2, 0.4); ctx.lineTo(4.2, 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-3.5, -0.7); ctx.lineTo(3.5, -0.7); ctx.stroke();
    ctx.restore();
  }
}

function drawBirds(ctx: Ctx, W: number, H: number, al: number, t: number) {
  const perches = [{ x: 0.172, y: 0.252 }, { x: 0.668, y: 0.342 }];
  for (let b = 0; b < 2; b++) {
    const hp = (t * 0.54 + b * 0.5) % 1;
    let bx: number, by: number;
    if (hp < 0.38) { bx = W * perches[0].x; by = H * perches[0].y + Math.sin(t * 3) * 2.6; }
    else if (hp < 0.58) { const ft = (hp - 0.38) / 0.2; bx = W * (perches[0].x + (perches[1].x - perches[0].x) * ft); by = H * (perches[0].y + (perches[1].y - perches[0].y) * ft - Math.sin(ft * Math.PI) * 0.08); }
    else { bx = W * perches[1].x; by = H * perches[1].y + Math.sin(t * 4 + b) * 2.3; }
    ctx.save(); ctx.globalAlpha = al; ctx.translate(bx, by);
    ctx.strokeStyle = "#2A2818"; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-3, -4.5); ctx.lineTo(0, -1); ctx.lineTo(3, -4.5); ctx.lineTo(7, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, Math.PI * 2); ctx.fillStyle = "#3A3028"; ctx.fill();
    ctx.restore();
  }
}

function drawHedgehog(ctx: Ctx, W: number, H: number, al: number, t: number) {
  const cz = ZONE_POS.corridor;
  const phh = (t * 0.14) % 1;
  ctx.save(); ctx.globalAlpha = al; ctx.translate(W * (cz.cx - cz.rw * 0.78 + phh * cz.rw * 1.56), H * cz.cy);
  ctx.beginPath(); ctx.ellipse(0, 0, 10, 6.5, 0, 0, Math.PI * 2); ctx.fillStyle = "#6A4828"; ctx.fill();
  ctx.strokeStyle = "#3A2414"; ctx.lineWidth = 1.3; ctx.lineCap = "round";
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI - 0.18;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5.5, -Math.sin(a) * 3.5); ctx.lineTo(Math.cos(a) * 9.5, -Math.sin(a) * 6); ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(-9.5, 0.8, 3.5, 2.5, 0.2, 0, Math.PI * 2); ctx.fillStyle = "#8A6838"; ctx.fill();
  ctx.beginPath(); ctx.arc(-8.5, -1.2, 1.3, 0, Math.PI * 2); ctx.fillStyle = "#100C08"; ctx.fill();
  ctx.restore();
}

function drawDragonfly(ctx: Ctx, W: number, H: number, al: number, t: number) {
  const pz = ZONE_POS.water;
  const cx = W * pz.cx, cy = H * pz.cy;
  const dx = cx + Math.sin(t * 1.38) * W * pz.rw * 0.6, dy = cy - H * pz.rh * 0.45 + Math.cos(t * 1.86) * 9;
  ctx.save(); ctx.globalAlpha = al; ctx.translate(dx, dy);
  ctx.save(); ctx.globalAlpha *= 0.6;
  ([[-1, -0.34], [1, -0.34], [-1, 0.34], [1, 0.34]] as const).forEach(([sy, ra]) => {
    ctx.save(); ctx.rotate(ra);
    ctx.beginPath(); ctx.ellipse(sy * 18, -7, 9.5, 3.5, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(118,192,224,0.70)"; ctx.fill(); ctx.restore();
  });
  ctx.restore();
  ctx.beginPath(); ctx.rect(-13, -1.8, 26, 3.6); ctx.fillStyle = "#1A5A90"; ctx.fill();
  ctx.beginPath(); ctx.arc(13, 0, 3.2, 0, Math.PI * 2); ctx.fillStyle = "#3A80B0"; ctx.fill();
  ctx.restore();
}

function drawCreatures(ctx: Ctx, W: number, H: number, env: Env) {
  if (env.intro < 0.78) return;
  const al = ph(env.intro, 0.78, 1.0);
  const { mode, t, perf } = env;
  if (mode === "overview" || mode === "pollinators") drawBees(ctx, W, H, al, mode === "pollinators", t, perf);
  if (mode === "birds") drawBirds(ctx, W, H, al, t);
  if (mode === "smallAnimals") drawHedgehog(ctx, W, H, al, t);
  if (mode === "waterLife") drawDragonfly(ctx, W, H, al, t);
}

function drawRing(ctx: Ctx, W: number, _H: number, score: number, intro: number) {
  const al = ph(intro, 0.64, 1.0), R = 42;
  const rx = W - 74, ry = 70;
  ctx.save(); ctx.globalAlpha = al;
  ctx.beginPath(); ctx.arc(rx, ry, R + 12, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.80)"; ctx.shadowColor = "rgba(22,16,6,0.14)"; ctx.shadowBlur = 16;
  ctx.fill(); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(rx, ry, R, -Math.PI * 0.5, Math.PI * 1.5);
  ctx.strokeStyle = "rgba(56,96,24,0.14)"; ctx.lineWidth = 7.5; ctx.stroke();
  const fill = ph(intro, 0.67, 1.0) * (score / 100);
  if (fill > 0.005) {
    const ea = -Math.PI * 0.5 + fill * Math.PI * 2;
    const rg = ctx.createLinearGradient(rx - R, ry, rx + R, ry);
    rg.addColorStop(0, "#388A26"); rg.addColorStop(0.5, "#60B040"); rg.addColorStop(1, "#A0D04E");
    ctx.strokeStyle = rg; ctx.lineWidth = 7.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(rx, ry, R, -Math.PI * 0.5, ea); ctx.stroke();
    const tx = rx + Math.cos(ea) * R, ty = ry + Math.sin(ea) * R;
    ctx.beginPath(); ctx.arc(tx, ty, 5.8, 0, Math.PI * 2);
    ctx.fillStyle = "#A0D04E"; ctx.shadowColor = "#A0D04E"; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
  }
  ctx.fillStyle = "#182C0A"; ctx.font = "bold 19px -apple-system,system-ui,sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(Math.round(score * ph(intro, 0.7, 1.0))), rx, ry - 5);
  ctx.font = "9px -apple-system,system-ui,sans-serif"; ctx.fillStyle = "#527038";
  ctx.fillText("Dyreliv", rx, ry + 11);
  ctx.restore();
}

function drawHotspots(ctx: Ctx, W: number, H: number, env: Env) {
  if (env.intro < 0.56) return;
  const al = ph(env.intro, 0.6, 0.88);
  const { selId, hovId, mode, t, habs } = env;
  habs.forEach((hab) => {
    const z = ZONE_POS[hab.kind]; if (!z) return;
    const cx = W * z.cx, cy = H * z.cy - H * z.rh * 0.78;
    const isSel = hab.id === selId, isHov = hab.id === hovId, act = isActive(hab, mode);
    ctx.save(); ctx.globalAlpha = (act ? 1 : 0.38) * al;
    if (isSel || isHov) {
      const pr = (t * 1.35) % 1;
      ctx.save(); ctx.globalAlpha *= (1 - pr) * 0.42;
      ctx.beginPath(); ctx.arc(cx, cy, 8 + pr * 16, 0, Math.PI * 2);
      ctx.strokeStyle = "#68C838"; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx, cy, isSel ? 7.0 : 5.2, 0, Math.PI * 2);
    ctx.fillStyle = isSel ? "#48981E" : isHov ? "#68B830" : "rgba(255,255,255,0.86)";
    ctx.shadowColor = isSel ? "#48981E" : "transparent"; ctx.shadowBlur = isSel ? 10 : 0;
    ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = isSel ? "#286810" : "rgba(46,94,20,0.72)"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  });
}

function drawLabel(ctx: Ctx, W: number, H: number, hab: WildlifeHabitat) {
  const z = ZONE_POS[hab.kind]; if (!z) return;
  const hp = hab.action && hab.action.plants && hab.action.plants.length;
  const ch = hp ? 82 : hab.action ? 68 : 56;
  const cw = 176;
  const cx = W * z.cx, cy = H * z.cy - H * z.rh * 0.78 - 22;
  const lx = Math.max(8, Math.min(W - cw - 8, cx - cw * 0.5));
  const ly = Math.max(8, Math.min(H - ch - 8, cy - ch));
  ctx.save();
  const r = 10;
  ctx.beginPath();
  ctx.moveTo(lx + r, ly); ctx.lineTo(lx + cw - r, ly); ctx.arcTo(lx + cw, ly, lx + cw, ly + r, r);
  ctx.lineTo(lx + cw, ly + ch - r); ctx.arcTo(lx + cw, ly + ch, lx + cw - r, ly + ch, r);
  ctx.lineTo(lx + r, ly + ch); ctx.arcTo(lx, ly + ch, lx, ly + ch - r, r);
  ctx.lineTo(lx, ly + r); ctx.arcTo(lx, ly, lx + r, ly, r); ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.shadowColor = "rgba(22,14,4,0.18)"; ctx.shadowBlur = 18; ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.97)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = "bold 12px -apple-system,system-ui,sans-serif"; ctx.fillStyle = "#162A0A";
  ctx.fillText(hab.name, lx + 11, ly + 18);
  ctx.font = "10px -apple-system,system-ui,sans-serif"; ctx.fillStyle = "#547038";
  ctx.fillText("Støtter: " + hab.supports.slice(0, 2).map((s) => SPECIES_NAMES[s]).join(", "), lx + 11, ly + 32);
  ctx.font = "bold 10px -apple-system,system-ui,sans-serif"; ctx.fillStyle = STRENGTH_COLOR[hab.strength] ?? "#547038";
  ctx.fillText(STRENGTH_LABEL[hab.strength] ?? hab.strength, lx + 11, ly + 46);
  if (hab.action) {
    const t2 = hab.action.title.slice(0, 22) + (hab.action.title.length > 22 ? "…" : "");
    ctx.font = "10px -apple-system,system-ui,sans-serif"; ctx.fillStyle = "#285A18";
    ctx.fillText(t2, lx + 11, ly + 60);
    ctx.font = "bold 10px -apple-system,system-ui,sans-serif"; ctx.fillStyle = "#388818";
    ctx.fillText("+" + hab.action.impact + " dyreliv", lx + cw - 70, ly + 60);
    if (hp && hab.action.plants) {
      ctx.font = "10px -apple-system,system-ui,sans-serif"; ctx.fillStyle = "#7A8858";
      ctx.fillText(hab.action.plants.slice(0, 2).join(", "), lx + 11, ly + 74);
    }
  }
  ctx.restore();
}

function drawScene(ctx: Ctx, W: number, H: number, env: Env) {
  const ox = (env.mx - 0.5) * 8, oy = (env.my - 0.5) * 4;
  ctx.save(); ctx.translate(ox, oy);
  drawSky(ctx, W, H, env.intro);
  drawFarTrees(ctx, W, H, env.intro);
  drawGround(ctx, W, H, env.intro);
  drawHabitats(ctx, W, H, env);
  drawCreatures(ctx, W, H, env);
  drawHotspots(ctx, W, H, env);
  if (env.selId) { const h = env.habs.find((x) => x.id === env.selId); if (h) drawLabel(ctx, W, H, h); }
  ctx.restore();
  drawRing(ctx, W, H, env.score, env.intro);
}

function hitHabitat(mx: number, my: number, W: number, H: number, habs: WildlifeHabitat[]): string | null {
  let best: string | null = null, bd = Infinity;
  habs.forEach((hab) => {
    const z = ZONE_POS[hab.kind]; if (!z) return;
    const dx = (mx - W * z.cx) / (W * z.rw + 22), dy = (my - H * z.cy) / (H * z.rh + 22);
    const d = dx * dx + dy * dy;
    if (d < 1.0 && d < bd) { best = hab.id; bd = d; }
  });
  return best;
}

// ─── Public skeleton ──────────────────────────────────────────────────────────

export function WildlifeHabitat3DSkeleton() {
  return (
    <div className="wl3d-skeleton" aria-hidden="true">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" stroke="#4A7820" strokeWidth="3" strokeDasharray="30 84" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function WildlifeHabitat3D({ score, mode: modeProp, onModeChange, habitats, selectedHabitatId, onSelectHabitat }: WildlifeHabitat3DProps) {
  const habs = useMemo(() => (habitats && habitats.length ? habitats : DEFAULT_HABITATS), [habitats]);

  const [mode, setMode] = useState<WildlifeHabitat3DMode>(modeProp ?? "overview");
  const [selId, setSelId] = useState<string | null>(selectedHabitatId ?? null);
  const [failed, setFailed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef(mode);
  const selRef = useRef(selId);
  const hovRef = useRef<string | null>(null);
  const mxRef = useRef(0.5);
  const myRef = useRef(0.5);
  const tRef = useRef(0);
  const introRef = useRef(0);
  const reducedRef = useRef(false);
  const perfRef = useRef<Perf>({ bees: 3, trailDots: 20, ripples: 4 });
  const habsRef = useRef(habs);
  const scoreRef = useRef(score);
  const cbRef = useRef({ onModeChange, onSelectHabitat });
  const drawRef = useRef<() => void>(() => {});

  habsRef.current = habs;
  scoreRef.current = score;
  cbRef.current = { onModeChange, onSelectHabitat };

  useEffect(() => {
    if (modeProp && modeProp !== modeRef.current) { setMode(modeProp); modeRef.current = modeProp; }
  }, [modeProp]);

  useEffect(() => {
    if (selectedHabitatId !== undefined && selectedHabitatId !== selRef.current) {
      setSelId(selectedHabitatId); selRef.current = selectedHabitatId;
    }
  }, [selectedHabitatId]);

  const changeMode = (m: WildlifeHabitat3DMode) => {
    setMode(m); modeRef.current = m; cbRef.current.onModeChange?.(m); drawRef.current();
  };

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    if (!cvs.getContext("2d")) { setFailed(true); return; }

    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedRef.current) introRef.current = 1;
    const lowPerf = window.innerWidth < 640 || (navigator.hardwareConcurrency || 8) <= 4;
    perfRef.current = lowPerf ? { bees: 1, trailDots: 0, ripples: 2 } : { bees: 3, trailDots: 20, ripples: 4 };

    const draw = () => {
      const c = canvasRef.current;
      if (!c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = c.offsetWidth || 900, H = c.offsetHeight || 500;
      if (W < 4 || H < 4) return;
      const pw = Math.round(W * dpr), pH = Math.round(H * dpr);
      if (c.width !== pw || c.height !== pH) { c.width = pw; c.height = pH; }
      const g = c.getContext("2d");
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(g, W, H, {
        mode: modeRef.current, selId: selRef.current, hovId: hovRef.current,
        t: tRef.current, intro: introRef.current, mx: mxRef.current, my: myRef.current,
        habs: habsRef.current, score: scoreRef.current, perf: perfRef.current,
      });
    };
    drawRef.current = draw;

    let raf = 0;
    let visible = true;
    const loop = () => {
      tRef.current += 0.016;
      introRef.current = Math.min(1, introRef.current + 0.01);
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && !reducedRef.current && visible) raf = requestAnimationFrame(loop); };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    const onClick = (e: MouseEvent) => {
      const r = cvs.getBoundingClientRect();
      const hit = hitHabitat(e.clientX - r.left, e.clientY - r.top, r.width, r.height, habsRef.current);
      const next = hit === selRef.current ? null : hit;
      setSelId(next); selRef.current = next;
      if (hit) cbRef.current.onSelectHabitat?.(hit);
      draw();
    };
    const onHover = (e: MouseEvent) => {
      const r = cvs.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (!reducedRef.current) { mxRef.current = x / r.width; myRef.current = y / r.height; }
      const hit = hitHabitat(x, y, r.width, r.height, habsRef.current);
      if (hit !== hovRef.current) { hovRef.current = hit; cvs.style.cursor = hit ? "pointer" : "default"; }
      if (reducedRef.current) draw();
    };
    const onLeave = () => { mxRef.current = 0.5; myRef.current = 0.5; hovRef.current = null; if (reducedRef.current) draw(); };
    const onTouch = (e: TouchEvent) => {
      const tch = e.touches[0]; if (!tch) return;
      const r = cvs.getBoundingClientRect();
      const hit = hitHabitat(tch.clientX - r.left, tch.clientY - r.top, r.width, r.height, habsRef.current);
      if (hit) {
        e.preventDefault();
        const next = hit === selRef.current ? null : hit;
        setSelId(next); selRef.current = next;
        cbRef.current.onSelectHabitat?.(hit);
        draw();
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      const tch = e.touches[0]; if (!tch || reducedRef.current) return;
      const r = cvs.getBoundingClientRect();
      mxRef.current = (tch.clientX - r.left) / r.width; myRef.current = (tch.clientY - r.top) / r.height;
    };

    cvs.addEventListener("click", onClick);
    cvs.addEventListener("mousemove", onHover);
    cvs.addEventListener("mouseleave", onLeave);
    cvs.addEventListener("touchstart", onTouch, { passive: false });
    cvs.addEventListener("touchmove", onTouchMove, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(() => draw()); ro.observe(cvs); }

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) { start(); if (reducedRef.current) draw(); } else stop();
      }, { threshold: 0.05 });
      io.observe(cvs);
    }

    draw();
    start();

    return () => {
      stop();
      ro?.disconnect();
      io?.disconnect();
      cvs.removeEventListener("click", onClick);
      cvs.removeEventListener("mousemove", onHover);
      cvs.removeEventListener("mouseleave", onLeave);
      cvs.removeEventListener("touchstart", onTouch);
      cvs.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const selected = selId ? habs.find((h) => h.id === selId) ?? null : null;
  const modeInfo: Record<WildlifeHabitat3DMode, string> = {
    overview: `Dyrelivsscore: ${score} · ${habs.length} levesteder kortlagt`,
    pollinators: "Bestøvere · Vilde bier, sommerfugle og nyttedyr",
    birds: "Fugle · Bær, buske og redesteder",
    smallAnimals: "Smådyr · Pindsvin, insekter og refugier",
    waterLife: "Vandliv · Frøer, salamandre og vandinsekter",
  };
  const infoText = selected ? selected.name + (selected.action ? ` · ${selected.action.title}` : "") : modeInfo[mode];
  const infoSub = selected ? "Støtter: " + selected.supports.map((s) => SPECIES_NAMES[s]).join(", ") : "Næste bedste greb";

  if (failed) {
    return (
      <div className="wl3d-fallback" role="group" aria-label="Dyreliv levesteder">
        <div className="wl3d-fallback-head">
          {MODE_LIST.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`wl3d-tab${mode === m.id ? " is-active" : ""}`}
              onClick={() => changeMode(m.id)}
            >
              {m.label}
            </button>
          ))}
          <span className="wl3d-fallback-score">Dyreliv: {score}</span>
        </div>
        <div className="wl3d-fallback-grid">
          {habs.map((h) => (
            <div key={h.id} className="wl3d-fallback-card" style={{ ["--wl3d-strength" as string]: STRENGTH_COLOR[h.strength] }}>
              <strong>{h.name}</strong>
              {h.action && <small>+{h.action.impact} · {h.action.title}</small>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="wl3d">
      <canvas ref={canvasRef} className="wl3d-canvas" aria-label="Interaktivt dyrelivskort — klik på et levested for detaljer" />

      <div className="wl3d-badge">
        <svg width="13" height="14" viewBox="0 0 13 14" fill="none" aria-hidden="true">
          <path d="M6.5 1C4.5 3 1.5 5.8 1.5 8.2C1.5 11 3.7 13 6.5 13C9.3 13 11.5 11 11.5 8.2C11.5 5.8 8.5 3 6.5 1Z" fill="#3A7820" />
          <line x1="6.5" y1="12.5" x2="6.5" y2="6.5" stroke="#265A14" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="6.5" y1="9" x2="4.5" y2="7" stroke="#265A14" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="6.5" y1="7.5" x2="8.5" y2="6" stroke="#265A14" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
        <span>Dyreliv</span>
      </div>

      <div className="wl3d-tabs" role="tablist" aria-label="Dyreliv visningsmode">
        {MODE_LIST.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            className={`wl3d-tab${mode === m.id ? " is-active" : ""}`}
            onClick={() => changeMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="wl3d-infobar" aria-live="polite" aria-atomic="true">
        <span className="wl3d-info-text">{infoText}</span>
        <span className="wl3d-info-sub">{infoSub}</span>
      </div>
    </div>
  );
}
