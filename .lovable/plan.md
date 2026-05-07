## Vision

Transform `/vandingsplan` from a bare timer list into a **delightful, intelligent watering operations console** that feels alive — animated, opinionated, and genuinely helpful. The page should make a user feel like they have a personal gardener powered by AI watching the weather, the soil, and every plant in every bed.

Three pillars: **Intelligence** (AI plans, weather-aware decisions), **Control** (full bed management, week timeline, manual overrides), **Delight** (smooth motion, micro-interactions, clear narrative).

---

## Phase 1 — Foundation & bed management

**Goal:** Stop sending users back to Havemåleren just to add a bed. Make zone CRUD live on this page.

- New "**+ Tilføj bed**" CTA in the page header (sticky on scroll).
- `AddBedDialog` (shadcn `Dialog`) with fields:
  - Name, type (lawn / vegetable / flower bed / border / tree / pot), area_m2 (number with quick chips: 5/10/20/50 m²), sun_exposure (sun / part-sun / shade — segmented control with sun icons), soil (sand / loam / clay — segmented control with texture swatches).
- Per-zone "Rediger bed" / "Slet bed" actions (confirm dialog for delete, cascades schedules first).
- Inline rename via double-click on zone title.
- Empty state: friendly hero block "Ingen beds endnu" with two paths — *Tilføj manuelt* or *Mål haven op*.

**Animations**
- Dialog: shadcn default scale-in + backdrop fade (already provided).
- New zone card animates in with `animate-fade-in` + a subtle green pulse on the border for 1s.
- Delete: card collapses height + fades (Framer Motion `AnimatePresence`).

**Files:** `src/components/watering/AddBedDialog.tsx`, `src/components/watering/EditBedDialog.tsx`, refactor `WateringPlan.tsx`.

---

## Phase 2 — Smart weather + decision engine (client)

**Goal:** Replace the naive `rain > 3mm = skip` with a real decision model the user can trust and see.

- Extend Open-Meteo daily params: `precipitation_sum`, `temperature_2m_max`, `et0_fao_evapotranspiration`, `wind_speed_10m_max`.
- New helper `src/lib/wateringAI.ts` exposing `decideForSchedule(schedule, zone, forecast, recentEvents) → { action: 'water'|'skip'|'reduce'|'boost', reason, deltaMin, mmExpected, confidence }`.
- Decision rules:
  - **Skip** if forecast precip ≥ soil-aware threshold (sand 5 / loam 4 / clay 3 mm) **or** last 48h precip > 10 mm.
  - **Boost +20%** if next-day temp max > 28 °C and zone is full sun.
  - **Reduce −25%** if ET0 < 1 mm/day (cool, humid).
  - **Confidence** score derived from forecast spread (used for UI tone — solid green vs. cautious amber).
- Each schedule row shows the decision pill: ✓ *Vand som planlagt · 18 min*, 🌧 *Springer over · 6.4 mm regn ventet*, 🔥 *AI øger til 22 min · varme 30 °C*, 💧 *AI sænker til 14 min · jorden er våd*.

**Animations**
- Decision pill cross-fades when forecast updates.
- Tap pill → expands inline reasoning panel (`accordion-down`).
- Weather strip cells lift on hover (`hover-scale`), wet days have a soft animated raindrop SVG.

**Files:** `src/lib/wateringAI.ts`, `src/components/watering/DecisionPill.tsx`, `src/components/watering/WeatherStrip.tsx`.

---

## Phase 3 — AI plan generation (Lovable AI Gateway)

**Goal:** Single button generates a complete, plant-aware watering plan for the whole garden.

**Edge function** `supabase/functions/generate-watering-plan/index.ts`:
- Inputs (POST): `gardenId`, `zones[]` (id, name, type, area_m2, sun, soil), `lat`, `lng`, optional `plantsByZone`.
- Server-side fetches 14-day forecast + monthly normals from Open-Meteo, joins `user_plants` ↔ `plants_catalog.water_need` per zone.
- Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with **tool calling** for strict JSON output:
  ```
  generate_plan(zones: [{ zone_id, schedules: [{ name, weekday_mask, start_time, duration_min, reasoning }] }], summary)
  ```
- System prompt encodes Danish climate, water-need multipliers, and conservative defaults.
- CORS, Zod input validation, 429/402 surfacing.

**Frontend**
- Top-level "**✨ Generér AI-plan**" button + per-zone "Lad AI lave plan for denne".
- Click → opens `AiPlanPreview` drawer/sheet showing the proposed schedules with diff vs. existing ("Erstat 2 · Tilføj 1 · Behold 1"). Per-zone reasoning visible.
- "Anvend plan" upserts into `watering_schedules`; "Tilpas" lets user edit before applying.

**Animations**
- Generate button: shimmer/aurora gradient sweep while loading (CSS `linear-gradient` + `background-position` animation, 1.4s).
- Preview drawer slides in from right (`slide-in-right`), schedules cascade in 60ms staggered with Framer Motion.
- On apply: success burst — checkmark scale-in, brief confetti particle burst (lightweight, no library — 8 SVG dots animated outward), zone cards re-render with the green pulse from Phase 1.

**Files:** `supabase/functions/generate-watering-plan/index.ts`, `src/components/watering/AiPlanPreview.tsx`, `src/components/watering/GenerateAiButton.tsx`.

---

## Phase 4 — Week timeline & per-zone insights

**Goal:** Replace the cramped "Næste: …" line with a glanceable week strip per zone.

- `WeekStrip` component: 7 chips (Mon→Sun), each shows date + tiny icon for the planned action that day (✓ planned / 🌧 skipped / 🔥 boosted / 💧 reduced / — off). Today is highlighted with the brand `--forest-800` ring.
- Tap a chip → tooltip / popover with full reasoning + "Vand denne dag i stedet" override.
- Insights row above schedules: *"Sandet jord · fuld sol · 3 tomatplanter → AI anbefaler 4×/uge, 18 min @ 06:30"*.

**Animations**
- Chip hover: subtle lift + colored shadow per state.
- Today chip: gentle breathing pulse (2s ease-in-out infinite, opacity 1↔.7 on inner dot only — never on text).
- Override action: chip flips with `rotateY` (Framer Motion) to reveal new state.

**Files:** `src/components/watering/WeekStrip.tsx`, `src/components/watering/ZoneInsights.tsx`.

---

## Phase 5 — Summary, savings & history

**Goal:** Show the value AI delivers — water saved, sessions optimized — so users *feel* the benefit.

- Top "**This week**" hero card:
  - Big number: planned liters this week (computed from `area × type-coefficient × duration`).
  - Secondary: "**Sparet ~38 L** takket være vejret" with animated count-up.
  - Mini bar showing planned vs. saved.
- "Seneste vandinger" upgraded:
  - Grouped by day, shows totals per day, per zone.
  - Skipped sessions show *why* (rain, wet soil, manual pause).
  - Hover row → shows mini sparkline of last 14 days for that zone.

**Animations**
- Count-up uses `requestAnimationFrame` over 800ms with ease-out cubic.
- Bar fill animates from 0 → target on mount (600ms).
- History rows fade-in staggered (40ms steps, max 10).

**Files:** `src/components/watering/WeekSummary.tsx`, `src/components/watering/HistoryList.tsx`, helpers in `src/lib/wateringAI.ts`.

---

## Phase 6 — Motion language & polish

**Goal:** Make the whole page feel like one coherent, premium product.

- **Page entrance:** header + summary fade-in (300ms), zone cards cascade in (80ms stagger).
- **Route transition:** existing `RouteTransition` respected; add `viewTransitionName` hooks where supported.
- **Sticky action bar** appears after scrolling past the summary card — slides down from top with `slide-in-right` adapted to top.
- **Schedule row interactions:**
  - Save indicator: tiny dot pulses next to field on debounced save (300ms after change), then fades.
  - Toggle "Aktiv": switch animates with shadcn `Switch`; disabled rows desaturate via `filter: grayscale(.6)` 250ms transition.
- **Microcopy & icons:** lucide-react icons (Droplets, CloudRain, Sun, Sprout, Sparkles for AI). Consistent semantic tokens — no ad-hoc colors.
- **Reduced motion:** respect `prefers-reduced-motion: reduce` — disable pulse, count-up shows instantly, drawer/dialog use opacity only.
- **Mobile (< 640px):**
  - Cards full-width with 16px padding.
  - Schedule row collapses into 2 lines + chevron expands the rest (`accordion-down`).
  - Sticky action bar becomes bottom sheet style.
  - Week strip becomes horizontally scrollable with snap.

**Files:** `src/pages/WateringPlan.tsx`, `src/components/watering/StickyActions.tsx`, `tailwind.config.ts` (only if a missing keyframe is needed — most exist).

---

## Phase 7 — QA, perf, accessibility

- Lighthouse pass: aim ≥ 95 a11y, 90 perf.
- All interactive elements keyboard-reachable; focus rings use `--forest-800`.
- ARIA labels on icon-only buttons (Slet, Vand nu, AI-plan).
- Avoid layout shift: reserve heights for animated count-ups and weather strip during fetch (skeleton with shimmer).
- Edge function: log + handle 429/402 with toast ("AI er optaget — prøv igen om lidt" / "AI-kreditter brugt op").
- Open-Meteo: cache last forecast in `sessionStorage` keyed by `lat,lng,date` (24h TTL) to avoid refetching on navigation.

---

## File map (final)

**New**
- `src/components/watering/AddBedDialog.tsx`
- `src/components/watering/EditBedDialog.tsx`
- `src/components/watering/WeatherStrip.tsx`
- `src/components/watering/WeekStrip.tsx`
- `src/components/watering/ZoneCard.tsx`
- `src/components/watering/ZoneInsights.tsx`
- `src/components/watering/DecisionPill.tsx`
- `src/components/watering/WeekSummary.tsx`
- `src/components/watering/HistoryList.tsx`
- `src/components/watering/AiPlanPreview.tsx`
- `src/components/watering/GenerateAiButton.tsx`
- `src/components/watering/StickyActions.tsx`
- `src/lib/wateringAI.ts`
- `src/styles/watering.css` (page-scoped animations: aurora shimmer, breathing pulse, raindrop)
- `supabase/functions/generate-watering-plan/index.ts`

**Modified**
- `src/pages/WateringPlan.tsx` — becomes a thin orchestrator using the new components.

---

## Technical notes

- **No DB schema changes required.** Existing tables (`garden_zones`, `watering_schedules`, `watering_events`) cover everything. (Optional v2: add `reasoning text` column on `watering_schedules` to persist AI rationale — skipped for v1.)
- **Plant data:** join `user_plants` with `plants_catalog` via `plant_slug` to get `water_need`. Multiplier: low 0.7 / medium 1.0 / high 1.3.
- **Water volume estimate:** lawn 4 L/m²·session, vegetable 6, flower bed 5, border 3, tree 8, pot 1. Used for liters display + savings.
- **Framer Motion** is already a dep (used elsewhere) — leverage `AnimatePresence` and `motion.div` for staggered lists.
- **No new external libs** needed.

---

## Out of scope (deliberately)

- Hardware/device control (deferred — `devices` table integration is a future phase).
- Drawing bed polygons on a map from this page (use Havemåler for spatial beds).
- Push notifications.
- Sharing plans / exporting PDF.

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| AI returns invalid JSON | Use Gateway tool-calling (forced schema), Zod-parse server-side, show toast on parse failure with "Prøv igen". |
| Open-Meteo rate-limit | Cache 24h in sessionStorage keyed by lat,lng. |
| Animations feel busy | Respect `prefers-reduced-motion`; never animate text, only containers/icons. |
| Mobile cramped | Dedicated mobile layout phase (Phase 6). |
| Big page gets slow | Code-split each component; lazy-load `AiPlanPreview` (only mounted when opened). |

---

## Success criteria

- A new user can: add a bed, generate an AI plan, see exactly when/why each watering will run, and override any day — all without leaving the page.
- Page feels alive: every state change has a clear, restrained motion.
- AI button → applied plan in under 6 seconds on average.
- Zero ad-hoc colors; everything uses semantic tokens.
