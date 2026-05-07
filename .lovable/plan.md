## Fix: brief blur when camera flattens to top-down

The remaining pop happens at the end — when `settle` eases pitch from 58° back to 0°. Flattening exposes a wider on-screen footprint of tiles than the pitched view, so Mapbox suddenly needs **more z18/z19 tiles** that weren't in the previous frustum. Until they decode, the flat view looks soft for ~150–400ms.

### What's still missing

1. We pre-warm a 3×3 grid at z17 + z18, but only z18 is centered on the destination — at the final flat view the camera covers a wider footprint, so edge tiles aren't warm.
2. The pre-warm uses the `{z}/{x}/{y}` template substitution, but the ortofoto template is **WMS bbox-based** (`{bbox-epsg-3857}`), so the pre-warm currently `continue`s and does nothing for ortofoto. The function is a no-op for the actual project.
3. There's no `idle` gate before `settle` — we wait before descending, but not before flattening, which is the frame the user notices.

### Plan

**1. Make the pre-warm actually run for the WMS source.**
Compute the EPSG:3857 bbox for each tile around the destination and substitute `{bbox-epsg-3857}` properly. Pre-warm a **5×5** grid at z18 and a **3×3** at z19 — covering the wider footprint of the final flat view, not just the pitched descent.

**2. Add an `idle` gate before the flatten.**
Right when `settle` is about to run, `await waitIdle(400)` (same helper we already added). Map flattens only after current tiles are decoded. 400ms cap so we never stall the cinematic.

**3. Slightly lengthen the settle ease.**
Bump `settleDur` from 700ms → 900ms so any final tile swap blends in during motion (motion blur masks small sharpness changes far better than a static frame does).

**4. Pre-warm continues during `descent`, not just `intro`.**
Re-issue the prewarm at the start of `descent` (cheap; browser dedupes via HTTP cache) so tiles for the *flat* footprint specifically are requested before the pitch-out begins.

**5. Tiny CSS safety net.**
Add a 250ms `filter: blur(0)` → from a barely-visible `blur(1.5px)` on `.pp-map` only during the `settle` → `handoff` transition. Acts as imperceptible motion-blur masking the very last tile swap. Disabled under `prefers-reduced-motion`.

### Files

- `src/components/havemaaler/PinpointSequence.tsx` — fix `prewarmOrtoTiles` (real WMS bbox), pre-warm wider grid, re-issue at descent, idle-gate before settle, bump `settleDur`.
- `src/components/havemaaler/pinpoint.css` — micro blur-clear transition on `.pp-map` during settle→handoff.

### Risks

- WMS bbox math: standard Web Mercator tile→bbox conversion is well-known; we'll match the same projection the source uses.
- Extra ~25 image requests during intro/descent — all cached, all cancelable, tiny payload.
