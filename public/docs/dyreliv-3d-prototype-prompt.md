# Claude Design Prompt — Dyreliv interactive 3D habitat prototype

You are designing an embeddable, production-ready interactive 3D prototype for the existing Havekongen React/Vite app. This prototype is for the **Dyreliv** page — not Havekompagnon. The experience should help users understand how their garden can support bees, butterflies, birds, hedgehogs, frogs, beneficial insects, and other small wildlife.

## Goal
Create a premium, visually impressive “living habitat twin” that turns garden wildlife planning into a clear, emotional, interactive moment. Users should immediately understand: “If I add nectar, shelter, water, berries, deadwood, and layered planting, my garden becomes alive.”

## Product scope
Focus only on **wildlife habitat planning**:
- Wildlife score / biodiversity potential.
- Habitat layers: flowers, shrubs, trees, water, deadwood, stones, leaf litter, nesting/shelter.
- Species groups: wild bees, butterflies, birds, hedgehogs, frogs/water life, beneficial insects.
- Suggested actions and plant/habitat mixes.

Do **not** design bed management, plant CRUD, watering timers, smart devices, commerce, checkout, or a general garden assistant.

## Visual direction
- Style: cinematic Scandinavian nature diorama, high-end garden ecology, tactile miniature terrain.
- Camera: isometric 3D garden slice with layered habitats; slow orbit/parallax on pointer movement.
- Mood: magical but credible, quiet, biodiverse, alive after rain.
- Palette: forest green, moss, meadow yellow, berry red, clay soil, pale stone, reflective pond blue, warm cream UI.
- Lighting: golden early morning, volumetric sun rays through grasses, soft ambient shadows, subtle dew sparkle.
- Material feel: hand-crafted clay/soil terrain, translucent water, soft moss, papery leaves, tiny flower heads.

## Core interactive experience
Create one embeddable React component named `WildlifeHabitat3D` with five modes:
1. **Overblik** — garden slice shows all habitat layers and a circular wildlife score glow.
2. **Bestøvere** — meadow flowers brighten; bees and butterflies follow gentle curved flight paths.
3. **Fugle** — shrubs/trees and berry clusters highlight; birds hop between perches.
4. **Smådyr** — leaf litter, log pile, stones, and hedgehog corridor glow; tiny rustling animation.
5. **Vandliv** — pond/rain bowl animates with ripples; frogs/dragonflies appear subtly.

## Wow-factor animation
The first 3 seconds should sell the product:
- Terrain assembles in soft layers from soil upward.
- Flowers bloom in staggered waves.
- A bee flight path draws itself as a golden dotted trail.
- Pond ripples catch light.
- The wildlife score ring grows from 0 to the current score.
- Tiny “habitat sparks” travel from actions to species groups.

Keep it elegant and performant — no chaotic particle storm.

## Interaction requirements
- Mode buttons in Danish: “Overblik”, “Bestøvere”, “Fugle”, “Smådyr”, “Vandliv”.
- Hover/click a habitat hotspot to show a floating label with:
  - Habitat name.
  - Species supported.
  - Recommended action.
  - Impact points, e.g. “+7 dyreliv”.
- Selecting a species group should highlight the habitats it needs and dim unrelated layers.
- Selecting an action should preview before/after: e.g. dull lawn patch transforms into meadow strip, or bare corner gains log pile and leaves.
- Include small ambient wildlife animations, but avoid precise realism requirements that would need external models.

## Integration-friendly data contract
Use this exact TypeScript API so the component can be integrated into the current app later:

```ts
type WildlifeHabitat3DMode = "overview" | "pollinators" | "birds" | "smallAnimals" | "waterLife";

type WildlifeHabitat3DProps = {
  score: number; // 0-100
  mode?: WildlifeHabitat3DMode;
  onModeChange?: (mode: WildlifeHabitat3DMode) => void;
  habitats: Array<{
    id: string;
    name: string;
    kind: "flowers" | "shrubs" | "trees" | "water" | "deadwood" | "stone" | "leafLitter" | "corridor";
    strength: "missing" | "weak" | "good" | "strong";
    supports: Array<"wildBees" | "butterflies" | "birds" | "hedgehogs" | "frogs" | "beneficialInsects">;
    action?: {
      title: string;
      impact: number;
      plants?: string[];
    };
  }>;
  selectedHabitatId?: string | null;
  onSelectHabitat?: (id: string) => void;
};
```

## Technical constraints
- Target stack: React 18, Vite, TypeScript.
- Keep assets procedural; do not require downloaded GLB/FBX models.
- Prefer `three` + `@react-three/fiber` if making actual 3D, but CSS 3D/SVG/canvas is acceptable if the exported API stays identical.
- If `@react-three/fiber` is used, lazy-load the module from the page to protect initial bundle size.
- Scope styles under `.wildlife-3d` or use CSS modules.
- No global CSS resets.
- No backend or network calls.
- Respect `prefers-reduced-motion: reduce` by stopping continuous orbit/flight and showing static highlights.
- Include a no-WebGL fallback that still renders the habitat map, score, mode buttons, and hotspots.
- Mobile height target: 340–420px. Desktop height target: 480–620px.
- Keep performance reasonable on mid-range phones: limit particles, instance repeated flowers/leaves, pause offscreen with IntersectionObserver.

## Accessibility requirements
- All mode controls must be keyboard reachable.
- Hotspots need readable labels and `aria-describedby` for details.
- Use `aria-live="polite"` for selected habitat/species updates.
- Ensure contrast works on warm cream backgrounds.
- Provide text equivalents for score and selected action.

## Expected deliverables
Deliver:
1. `WildlifeHabitat3D.tsx` — self-contained React component.
2. `WildlifeHabitat3D.css` or module CSS — scoped styles only.
3. `WildlifeHabitat3DSkeleton` — lightweight loading placeholder.
4. `WildlifeHabitatFallback` — no-WebGL/reduced-motion fallback.
5. A short integration example mapping existing Dyreliv data (`score`, gaps/actions, residents/species groups, zone/habitat suggestions) into the `habitats` prop.
6. Notes on optional polish: bloom strength, particle budget, pond ripple intensity, mobile quality setting.

## Content tone
Use Danish UI copy. Keep labels concise and warm:
- “Dyrelivsscore”
- “Bestøvere”
- “Fugle”
- “Smådyr”
- “Vandliv”
- “Støtter”
- “Gør haven vildere”
- “Næste bedste greb”

## Make it feel premium
This should feel like a beautiful living ecology model, not a game level. It should be visually strong enough for a landing page hero, but structured enough to ship inside the current Dyreliv page as a real, data-driven component.
