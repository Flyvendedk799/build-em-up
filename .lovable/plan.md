## Two polish fixes for `PinpointSequence`

Both issues are in `src/components/havemaaler/PinpointSequence.tsx` (+ tiny CSS tweak). No changes to game logic, routing, or `GardenSizer` business code.

---

### 1. Kill the ~0.7s freeze right after clicking the address

**What's happening:** The instant `setPinpointing(...)` fires in `GardenSizer.chooseAddress`, React mounts `PinpointSequence`, which synchronously:
- builds a Mapbox style object,
- calls `new mapboxgl.Map(...)` (heavy: WebGL context creation, shader compile, worker spin-up),
- waits for the first tile batch before the map's CSS opacity transitions from 0 → 1.

During that work the main thread is busy, so the overlay itself appears late and the click feels frozen.

**Fix — instant overlay, deferred map boot:**

1. Render the overlay chrome (`pp-stage`, aurora, vignette, HUD steps, address card, "Spring over") on the very first frame with map container empty. CSS fade of the dark backdrop + HUD slides in immediately so the click feels acknowledged within ~16ms.
2. Defer the Mapbox `new Map(...)` call to the next frame using `requestAnimationFrame` (double-RAF) inside the mount effect. The browser paints the overlay before the heavy WebGL init runs.
3. Add a new `booting` substate of `intro`. While booting, show a subtle "Finder adresse…" shimmer on the first HUD step (already designed) and a soft loader pulse over `pp-map` so the dark area doesn't look dead.
4. Pre-warm the Mapbox token + satellite low-zoom tiles in `GardenSizer` the moment the user **opens** the suggestion dropdown (cheap `<link rel="preconnect">` to `api.mapbox.com` and `api.dataforsyningen.dk`, plus a single Image() fetch of a low-z satellite tile). This shaves the TLS handshake off the critical path.
5. Trim `fadeDuration` on the map constructor from 600 → 300 so the first tile paint is snappier (we already cross-fade visually via CSS).

Net result: the overlay is visible within one frame; the WebGL boot happens "behind" the already-visible UI, so the perceived freeze disappears.

---

### 2. Keep imagery sharp through every camera angle

**What's happening:** During the `descent` leg (zoom 15 → 18.7, pitch 0 → 58), there's a window roughly between zoom 15.5 and 17 where:
- `mapbox.satellite` is fading out (current interp `14→17`) and gets overzoomed/stretched at the steep pitch,
- the Danish ortofoto hasn't loaded its higher-zoom tiles yet,
- so the viewer sees a blurry frame for ~0.3–0.6s.

**Fix — extend sharp coverage and pre-load orto tiles:**

1. **Shift the cross-fade window earlier and tighter** in `buildStyle()`:
   - satellite `raster-opacity`: `13 → 1`, `15.5 → 0` (was 14→17)
   - orto `raster-opacity`: `13 → 0`, `15.5 → 1` (was 14→17)
   This means the high-res Danish ortofoto is fully driving the view from zoom 15.5 onward — exactly when the camera starts pitching.
2. **Bump satellite source `maxzoom` honesty:** keep `maxzoom: 19` (not 22) so Mapbox stops requesting overzoomed stretches; the orto layer takes over before that point anyway.
3. **Pre-warm orto tiles for the destination** before the descent begins. As soon as `approach` starts, fetch a 3×3 grid of orto tiles around `center` at zoom 17 and 18 via hidden `Image()` requests (using the same WMS template). They land in HTTP cache so when Mapbox requests them during descent they paint instantly.
4. **Hold for tiles before pitching:** add a `map.once('idle', …)` (with a 600ms safety timeout) at the *start* of the descent leg. Only after idle (or timeout) do we kick off the pitched `easeTo`. Guarantees we never pitch into half-loaded tiles.
5. **Subtle blur-mask during the worst frame:** keep `pp-vignette` opacity slightly higher during `descent` (already there) and add a very light `backdrop-filter: blur(0.5px)` on the vignette edges only — masks any residual softness without affecting the centre where the pin lands.

---

### Files touched

- `src/components/havemaaler/PinpointSequence.tsx` — deferred map boot, descent `idle` gate, orto prewarm, cross-fade ranges, `maxzoom`, `fadeDuration`.
- `src/components/havemaaler/pinpoint.css` — booting shimmer state for the first HUD step + tiny vignette tweak.
- `src/pages/GardenSizer.tsx` — add `<link rel="preconnect">` warm-up when the address suggestion list opens (~5 lines, presentation-only).

### Risks / fallbacks

- `idle` event may not fire on flaky networks → the 600ms timeout guarantees the sequence always continues.
- Pre-warm fetches are best-effort (no error handling needed; they just populate cache).
- All timings stay within the existing `makeTimings` table so the overall ~5.5s rhythm is unchanged.
