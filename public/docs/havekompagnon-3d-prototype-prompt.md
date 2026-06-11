# Claude Design Prompt — Havekompagnon 3D bed, plant and watering prototype

You are designing an embeddable interactive 3D hero/prototype for the existing Havekongen React/Vite app. Create a premium, production-oriented concept for the Havekompagnon page. The product scope is intentionally narrow: **bed management, plant management, and watering only**.

## Goal
Build a visually stunning, interactive 3D garden-bed prototype with strong “wow factor” that can be integrated into a real React project without becoming a disconnected art piece. It should make users immediately understand: “I create beds, place plants, and water each bed intelligently.”

## Visual direction
- Style: Scandinavian garden-tech, tactile clay/soil diorama, soft natural materials, subtle glass UI panels, daylight with gentle shadows.
- Camera: isometric 3D view of a raised garden bed on warm paper background; allow small parallax/rotation on pointer movement.
- Mood: calm, premium, alive, slightly magical — not gamified or childish.
- Palette: deep forest green, moss, terracotta soil, pale stone, warm cream, clear water blue accents.
- Lighting: soft morning sun, ambient occlusion, contact shadows, tiny glints on water droplets.
- Motion: slow leaf sway, pulsing moisture rings, animated water path, seedlings gently growing when selected.

## Interactive animation requirements
Create one embeddable React component named `CompanionGarden3D` with these three interactive modes:
1. **Beds** — shows 3 raised beds. Selecting a bed lifts it 8–12px, highlights its border, and shows a mini label with area, sun and soil.
2. **Plants** — plants appear as grouped stylized sprouts/herbs/tomatoes inside the selected bed. Selecting a plant shows a floating label with name and water need.
3. **Watering** — water droplets/rings animate over the selected bed. Show a glowing route from a water source to the bed and a compact status chip: “Next: 06:30 · AI adjusts for rain”.

## UX structure
- Component must fit inside the existing Havekompagnon page as a hero module or top card.
- Desktop dimensions: responsive, ideal height 420–520px.
- Mobile: height 320–380px, simplified controls and reduced particle count.
- Include an accessible fallback: if WebGL/3D fails, render a static CSS/SVG-like garden card with the same three mode buttons.
- Use visible mode buttons: “Bede”, “Planter”, “Vanding”.
- Keep the data contract simple and integration-friendly:

```ts
type CompanionGarden3DProps = {
  beds: Array<{
    id: string;
    name: string;
    areaM2: number;
    sun: "sun" | "part" | "shade";
    soil: "sand" | "loam" | "clay";
    plants: Array<{
      id: string;
      name: string;
      waterNeed: "low" | "medium" | "high";
      qty: number;
    }>;
    nextWatering?: string | null;
  }>;
  selectedBedId?: string | null;
  mode?: "beds" | "plants" | "water";
  onSelectBed?: (id: string) => void;
  onModeChange?: (mode: "beds" | "plants" | "water") => void;
};
```

## Technical constraints for integration
- Target stack: React 18, Vite, TypeScript.
- Prefer `three` + `@react-three/fiber` if generating a 3D component, but keep all assets procedural so no external model downloads are required.
- If you do not use React Three Fiber, create the same visual using CSS 3D + SVG/canvas, but keep the exported React API identical.
- Do not require a backend or network call.
- Do not add global CSS resets. Scope styles under `.companion-3d` or CSS modules.
- Respect reduced motion: disable continuous animation when `prefers-reduced-motion: reduce`.
- Keep bundle impact reasonable: lazy-load the 3D module from the page.
- Export a small loading skeleton and a no-WebGL fallback.
- Use semantic labels for buttons and `aria-live="polite"` for selected bed/plant status.

## Output expected
Deliver:
1. `CompanionGarden3D.tsx` — self-contained component.
2. `CompanionGarden3D.css` or module CSS — scoped styles only.
3. A short integration example showing how the current Havekompagnon page maps its `garden_zones` and `user_plants` data into `beds`.
4. Notes on optional polish: bloom intensity, particle count, mobile performance settings.

## Copy and labels
Use Danish UI labels:
- “Bede”
- “Planter”
- “Vanding”
- “Næste vanding”
- “Vandbehov”
- “Sol”
- “Jord”

## Make it feel impressive
The first 3 seconds should sell the product: the bed settles into view, soil particles softly lift, plants breathe, and a small water shimmer travels to the selected bed. The animation should feel like a living garden twin — beautiful enough for a landing page, practical enough to ship inside the working app.
