# Havemåler v2 — Ambitious upgrade

Goal: turn the current "click corners on a fuzzy satellite tile" tool into a precise, semi-automatic lawn measurement experience with crisp aerial imagery, AI-assisted grass selection, and a much better drawing UX.

## 1. High-resolution Danish aerial imagery

Mapbox satellite tops out around ~30 cm/px and is dated in DK. We replace it (or layer over it) with **Dataforsyningen / SDFE ortofoto WMTS** — official Danish 12.5 cm orthophotos, free for non-commercial use with a token.

- Add `DATAFORSYNINGEN_TOKEN` secret (user obtains from dataforsyningen.dk — free signup).
- New edge function `get-ortofoto-config` returns `{ token, wmtsUrl }` so the token never ships to the browser bundle.
- In `GardenSizer.tsx`, register a Mapbox `raster` source pointing at the WMTS `orto_foraar_wmts` layer (latest spring orthophoto, ~12.5 cm). Use it as the base; keep Mapbox satellite as fallback if the WMTS call fails or user is outside DK.
- Add a small "Billede" toggle: `Ortofoto 2024` / `Mapbox satellit` / `Skråfoto` (skråfoto via Dataforsyningen's `Skraafoto` API — oblique imagery for orientation).
- Bump max zoom to 21 and enable `maxTileCacheSize` tuning so panning at z20+ is smooth.

## 2. Matrikel (cadastral) overlay

Pull the property boundary directly so users see exactly what they own.

- Use Dataforsyningen **Matrikel WFS** (`matrikel:Jordstykke`) — query by point (the geocoded address) to fetch the parcel polygon as GeoJSON.
- Render as a dashed gold outline on the map; offer a one-click "Brug matrikel som udgangspunkt" button that seeds the polygon points from the parcel boundary so the user only has to trim away house/driveway.

## 3. AI-assisted grass selection ("magic wand")

The headline feature. User clicks once on grass, we auto-trace a polygon around the connected lawn area.

Two layered approaches, fall back gracefully:

**A. Client-side NDVI-like color segmentation (fast, offline).**
- When the user enters drawing mode, render the current map viewport to an offscreen canvas via `map.getCanvas()` + `html2canvas` style readback (Mapbox supports `preserveDrawingBuffer`).
- On "magic wand" click: run a flood-fill in HSV space from the click pixel, accepting pixels where hue ∈ green band (~70–160°) and saturation > threshold. Tolerance slider in UI.
- Trace the resulting binary mask with a marching-squares contour (use `d3-contour` — already small, no native deps), simplify with `turf.simplify` (tolerance ~0.00002), and convert pixel coords back to lng/lat via `map.unproject`.
- Result: a closed polygon the user can nudge.

**B. Server-side segmentation (higher quality, optional).**
- New edge function `segment-lawn` that:
  1. Receives `{ bbox, zoom }`.
  2. Fetches the corresponding ortofoto tile(s) server-side.
  3. Calls a vision model (Lovable AI `google/gemini-2.5-pro` with image input) prompted to return a GeoJSON polygon of the lawn area, or — better — runs a small ONNX segmentation model (e.g. a quantised DeepLabv3-MobileNet trained on aerial imagery) via `onnxruntime-web` if we want to keep it deterministic.
  4. Returns simplified polygon GeoJSON.
- Trigger via a "AI-foreslå plæne" button. Show a skeleton pulse while loading.
- Cache by tile-bbox hash in a new `lawn_segmentation_cache` table to avoid re-billing.

Phase 1 ships A; B is wired behind a feature flag and the same UI button.

## 4. Drawing UX overhaul

Current tool only supports add-corner + close. Add:

- **Vertex editing**: drag any existing vertex; insert vertex on edge by clicking the midpoint handle (rendered as small hollow dots).
- **Multi-polygon / holes**: support adding "exclusion" polygons (e.g. terrace, flowerbed) that subtract from the lawn area. Use `turf.difference`. New tool buttons: `+ Område`, `– Udeluk`.
- **Snap-to-edge**: when drawing near an existing vertex (≤10px) snap visually + audibly (subtle).
- **Keyboard**: `Z` undo, `Esc` cancel current draw, `Enter` close polygon, `Del` remove selected vertex.
- **Measurement HUD upgrades**: live edge length labels along each segment while drawing; total area + perimeter pill already exists, add "ekskluderet" sub-line.
- **Mobile**: long-press to add vertex, two-finger pan, dedicated bottom toolbar.

## 5. Smarter recommendations

- Compute lawn **complexity** (perimeter² / area ratio) and **slope** (sample Dataforsyningen DHM elevation WCS at polygon vertices). Feed into tier selection so a 600 m² lawn with high complexity bumps to R2.
- Show "passages" detection: narrow corridors <0.6 m flagged as problematic for the recommended model.
- Add an "Eksporter" menu: GeoJSON, KML, PDF report (areal, omkreds, anbefaling, kort-snapshot via `map.getCanvas().toDataURL()`).

## 6. Persistence & re-edit

- When saving, also persist the simplified polygon, exclusions array, image source used, and a thumbnail (PNG) to a new column `gardens.thumbnail_url` (Supabase Storage bucket `garden-thumbnails`, public read).
- Account page already lists gardens — add an "Åbn i havemåler" link that hydrates `GardenSizer` from saved polygon for re-editing.

## Technical layout

```text
src/pages/GardenSizer.tsx          orchestrator, becomes ~thin
src/features/sizer/
  useImagerySource.ts              switch between ortofoto / mapbox / skraafoto
  useMatrikel.ts                   WFS lookup + render layer
  useDrawing.ts                    vertex/edge/exclusion state machine
  useMagicWand.ts                  client-side flood-fill + contour
  segmentation.ts                  calls segment-lawn edge fn
  measurements.ts                  area/perimeter/slope/complexity
  exporters.ts                     geojson/kml/pdf
  components/
    Toolbar.tsx, ImagerySwitch.tsx, EdgeLabels.tsx, MagicWandHint.tsx

supabase/functions/
  get-ortofoto-config/             returns WMTS url + token
  segment-lawn/                    image -> polygon (Lovable AI or ONNX)

migrations:
  - gardens: add thumbnail_url text, exclusions jsonb, imagery_source text
  - new lawn_segmentation_cache (bbox_hash pk, polygon jsonb, created_at)
  - storage bucket garden-thumbnails (public read, auth write)
```

New deps: `@turf/difference`, `@turf/simplify`, `d3-contour`, `proj4` (for WMTS tile math if needed). All small and tree-shakeable.

## Rollout order

1. Migrations + storage bucket + `DATAFORSYNINGEN_TOKEN` secret prompt.
2. `get-ortofoto-config` edge fn + imagery switch (instant visual win).
3. Matrikel overlay + "use matrikel" seed.
4. Drawing UX overhaul (vertex edit, exclusions, edge labels, keyboard).
5. Client-side magic wand.
6. Server segmentation edge fn behind flag.
7. PDF export + re-edit from saved garden + thumbnails.

Each step is independently shippable.

## Open questions

- Are you OK signing up at dataforsyningen.dk for a free token? (required for ortofoto + matrikel + DHM).
- Do you want the AI segmentation (step 6) in this round, or defer until after the client-side wand proves out?
- Commercial use of Dataforsyningen requires a paid agreement — is build-em-up.lovable.app commercial?
