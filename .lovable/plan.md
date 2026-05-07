
# Vision

Turn Vandingsplan and Plantepleje AI into a single, intelligent "Garden Brain" that knows the user's garden, weather, plants, devices and shopping — proactively saving water, time and plants. Cross-integrated with Havemåler, Webshop, Account and Notifications.

The 36 phases are grouped into 9 sequences. Each phase is independently shippable.

---

## Sequence A — Foundations & Data Model (Phase 1–4)

**Phase 1 — Unified "Garden Brain" data layer**
New tables: `zone_plantings` (link plants → zones with density/age), `weather_cache` (daily ET0/precip/temp per lat,lon), `watering_runs` (actual mm + liters delivered), `ai_recommendations` (typed recs across modules), `task_log` (any garden action). Indexes + RLS.

**Phase 2 — Weather service v2**
Edge function `weather-sync` pulls 14-day Open-Meteo + DMI radar nowcast; caches per garden; exposes `getForecast(gardenId)` everywhere (Vanding, Plantepleje, Have-måler).

**Phase 3 — Plant intelligence catalog**
Extend `plants_catalog` with `kc` (crop coefficient), `root_depth_cm`, `frost_risk`, `disease_risks[]`, `companion_plants[]`, `month_tasks` (sow/prune/fertilize/harvest/winterize). Seed via AI batch.

**Phase 4 — Soil & microclimate model**
Per zone: soil type, slope, mulch, shade %, wind exposure. Used for ET0 multiplier and runoff risk. UI in bed editor.

---

## Sequence B — Watering Intelligence Core (Phase 5–9)

**Phase 5 — Soil-water balance engine**
Replace ad-hoc deficit with proper FAO-56 daily balance: `θ(t+1) = θ(t) + rain + irrigation − ETc − runoff`. Per-zone state persisted; drives all decisions.

**Phase 6 — Smart schedule generation v2**
AI generates *adaptive* schedules: not just times, but rules ("water when deficit > 60% AND no rain >5mm in next 36h"). Stored as JSON conditions on `watering_schedules.rule`.

**Phase 7 — Hyperlocal rain skip + rain-harvest**
Use radar nowcast (next 2h) for last-mile skip. Track "saved liters" + cumulative € saved (vandafgift DK ~70 kr/m³). Hero counter.

**Phase 8 — Frost & heatwave guard**
Auto-shift schedules: pre-water before heatwaves, suspend before frost, pre-soak before drought weekends.

**Phase 9 — Manual override & feedback loop**
"Jeg vandede selv" / "Det var for meget/lidt" buttons. Feeds back into per-zone learned multiplier (simple bayesian update).

---

## Sequence C — UX & Animation Polish (Phase 10–14)

**Phase 10 — Hero "Today" cinema**
Full-bleed hero: animated water droplet ring counting today's planned liters, weather glyph morph (sun → cloud → rain), live "next run in 02:14:33". Framer-motion + canvas.

**Phase 11 — Zone cards 2.0**
Each bed becomes a card with: live moisture gauge (animated), micro-forecast strip, last/next watering, plants thumbnails, quick "vand nu / spring over / 5 min ekstra".

**Phase 12 — Timeline & Calendar view**
Toggle list/timeline/calendar. Drag-to-reschedule. Week heatmap of mm delivered vs ET0.

**Phase 13 — Mobile-first redesign + haptics**
Bottom sheet controls, swipe-to-snooze, pull-to-refresh forecast, install-as-PWA prompt.

**Phase 14 — Empty/loading/error states**
Skeletons, illustrated empty states ("Tilføj dit første bed"), retry flows. Consistent across modules.

---

## Sequence D — Plantepleje AI elevation (Phase 15–20)

**Phase 15 — Context-aware chat**
Inject active garden, zones, plants, recent weather, last watering events into system prompt. Chat knows "din tomatzone fik 8mm i går".

**Phase 16 — Photo diagnosis pipeline**
Upload plant photo → Gemini multimodal → structured diagnosis (disease, severity, treatment, products). Save to `plant_health_log`.

**Phase 17 — Tool-calling agent**
Plantepleje AI can: create watering schedule, add plant to zone, add task, add product to cart, book reminder. All as function tools in edge function.

**Phase 18 — Seasonal coach**
Weekly AI digest per garden: "Denne uge i din have" — sow, prune, watch for X disease, harvest Y. Push notification + email.

**Phase 19 — Plant journal**
Per-plant timeline (planted, watered, fertilized, harvested, photos). AI auto-generates entries from events. Shareable card.

**Phase 20 — Voice mode**
Speech-to-text input + TTS reply for hands-in-dirt usage. Web Speech API fallback, Lovable AI for transcribe.

---

## Sequence E — Cross-Platform Integration (Phase 21–25)

**Phase 21 — Havemåler ↔ Vanding bridge**
Polygons drawn in Havemåler auto-create zones with area, sun (from satellite shadow analysis), suggested plants. One-click "Lav vandingsplan af min have".

**Phase 22 — Webshop recommendations engine**
Based on zones/plants/diagnoses → recommended products (seeds, mulch, dryppeslange, sensorer). Card on Vanding + Plantepleje pages. Tracked attribution.

**Phase 23 — Device integration framework**
`devices` table already exists. Add adapters for: Gardena smart, generic MQTT, manual valve. UI to bind schedule → device. Status pings.

**Phase 24 — Bundle "Smart Garden Kit"**
Pre-configured PDP that provisions: sensors + valves + initial schedule. One purchase = working setup.

**Phase 25 — Notifications hub**
Unified `notifications` feed: rain-skip, frost warning, harvest-ready, low battery, order shipped. Channels: in-app, email, push, WhatsApp (later).

---

## Sequence F — Intelligence Layer (Phase 26–29)

**Phase 26 — AI plan explainability**
Every decision has a "why" trace: forecast, soil, plant Kc, history. Inspector drawer.

**Phase 27 — What-if simulator**
Slider: "hvad hvis det regner 0/5/15mm" → preview week's adjusted plan. Educational.

**Phase 28 — Anomaly detection**
Detect: zone consistently overwatered, sensor drift, schedule never run. Surface as recommendations.

**Phase 29 — Yield & savings dashboard**
Liters used vs baseline, kr saved, CO₂ saved, harvest logged. Yearly wrap-up shareable card ("Din havesæson 2026").

---

## Sequence G — Community & Content (Phase 30–32)

**Phase 30 — Local benchmarks**
"Haver i dit postnummer brugte 12% mindre vand denne uge". Anonymized aggregates.

**Phase 31 — Templates marketplace**
Share/import zone+schedule+plant templates ("Køkkenhave 10m²", "Staudebed nord"). Curated + community.

**Phase 32 — Expert content hub**
SEO-grade Danish articles per plant + season, JSON-LD, deep-linked from chat answers. Drives organic traffic.

---

## Sequence H — Trust, Performance, Accessibility (Phase 33–34)

**Phase 33 — Performance & offline**
Route-level code split, prefetch on hover, IndexedDB cache of plan + forecast for offline view, Lighthouse ≥95.

**Phase 34 — A11y + i18n scaffold**
WCAG AA: focus rings, ARIA on gauges, prefers-reduced-motion. i18n keys (da default, en next).

---

## Sequence I — Growth & Moats (Phase 35–36)

**Phase 35 — Onboarding rebuilt**
3-min flow: address → satellite polygon → AI suggests zones+plants → first schedule → install PWA. Conversion-optimized.

**Phase 36 — Referral + Pro tier**
Free: 1 garden, basic AI. Pro: unlimited gardens, device control, weekly digest, photo diagnosis, voice. Referral = 1 month Pro.

---

## Technical Notes

- **AI**: Lovable AI Gateway only. Default `google/gemini-3-flash-preview`; use `gemini-2.5-pro` for plan generation, `gemini-2.5-flash-image` for diagnosis.
- **Edge functions to add**: `weather-sync`, `garden-brain` (tool-calling agent), `plant-diagnose`, `weekly-digest`, `device-bridge`, `recommendations`.
- **DB migrations**: all additive, RLS by `user_id`, audit triggers reused.
- **Design**: keep watering.css tokens; add new motion tokens; honor prefers-reduced-motion.
- **No breaking changes**: existing schedules/zones forward-compatible.

## Suggested first sprint

If you want to ship momentum: **Phase 1 + 2 + 5 + 10 + 15 + 21**. That's the foundation, the visible polish, the smarter chat, and the killer Havemåler bridge — in one go.

Tell me which phases to start with, or say "go from phase 1" and I'll execute in sequence with checkpoints.
