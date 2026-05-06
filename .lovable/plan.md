# Immersive Product Detail Page

Turn `/webshop/:slug` from a standard two‑column layout into an editorial, scroll‑driven experience that feels closer to a luxury garden brand site than a typical webshop.

## Vision

A cinematic PDP built in distinct "acts": a hero that breathes, a sticky media stage that reacts to scroll, a story section, a "see it in your garden" tool, social proof, and an intelligent cross‑sell. Same product data, dramatically more presence.

## Acts (top to bottom)

1. **Hero stage**
   - Full‑viewport split: left = oversized serif product name with animated entrance, category eyebrow, price, primary CTAs. Right = animated product canvas (the existing gradient + SVG art) with parallax, a subtle floating shadow, and a soft Ken‑Burns drift.
   - Background uses a derived tint from the product gradient (extracted at runtime) bleeding into the page.
   - Breadcrumb + wishlist + share float at top.

2. **Sticky media stage / scrollytelling**
   - As the user scrolls, the product visual stays pinned on one side while the other side advances through 3–4 "chapters": *Materials*, *Mål & dimensioner*, *Pleje*, *Bæredygtighed*. Each chapter swaps copy + a small inline diagram/SVG accent and nudges the hero art (rotation, zoom, color overlay) so it feels like the product is being inspected.

3. **Variant & configurator strip**
   - Sticky horizontal bar (becomes sticky on scroll past hero) with: variant chips, qty stepper, live price, "Læg i kurv" + "Køb nu". Replaces the current mobile sticky CTA with a unified responsive component.

4. **"Pas til min have" panel**
   - Pulls the active garden from `activeGarden.ts`. Shows: "Passer i din have (X m²) — fylder ~Y%" with a tiny scaled silhouette overlay. If no garden yet, CTA → `/garden-sizer`.
   - For plant products: pulls weather context from the existing watering plan to show "Vandes ~N gange/uge i din zone".

5. **Specs grid**
   - Editorial 3–4 column spec table (Materiale, Mål, Vægt, Oprindelse) styled as a magazine sidebar, not a boring `<table>`.

6. **Story / long description**
   - Full‑bleed band with the product gradient as background, large serif pull quote, and `description` typeset as a single editorial column with drop cap.

7. **Reviews & trust**
   - Star summary, 2–3 highlighted reviews, trust badges (fragtfri over X, 30 dages retur, dansk kundeservice). Pulls from a new `product_reviews` table if present, otherwise renders a graceful empty state with "Vær den første".

8. **Cross‑sell: "Komplet din have"**
   - Bundle row: current product + 2 complementary items (same category or curated). Single "Tilføj alle (–10%)" CTA that adds them all to cart with a bundle note.

9. **Related + recently viewed**
   - Keep current sections but restyle as horizontal snap‑scroll carousels with peek.

## Interaction & motion

- Framer‑motion for hero entrance, chapter transitions, and sticky stage parallax.
- `IntersectionObserver` to drive chapter state (no heavy scroll libs).
- Respect `prefers-reduced-motion` everywhere — fall back to instant transitions.
- Cursor‑follow soft glow on the hero canvas (desktop only).
- Image stage supports pinch/drag zoom on mobile via a lightweight gesture handler.

## Technical notes

- New components (frontend only):
  - `src/pages/ProductDetail.tsx` — rewritten as a thin orchestrator.
  - `src/components/pdp/HeroStage.tsx`
  - `src/components/pdp/StickyMediaStage.tsx` (chapters + pinned visual)
  - `src/components/pdp/StickyBuyBar.tsx` (replaces `.pdp-sticky`)
  - `src/components/pdp/FitInGarden.tsx` (uses `activeGarden`)
  - `src/components/pdp/SpecsGrid.tsx`
  - `src/components/pdp/StoryBand.tsx`
  - `src/components/pdp/ReviewsBlock.tsx`
  - `src/components/pdp/BundleRow.tsx`
  - `src/components/pdp/ProductCarousel.tsx` (snap‑scroll)
- Styling: extend `src/styles/app.css` with a scoped `.pdp-*` block; use existing tokens (`--ink-*`, `--mist-*`, `--serif`, `--r-lg`). No new color tokens unless needed for tinted backgrounds (derived at runtime via CSS `color-mix`).
- Data: reuse current `products` query. If reviews table doesn't exist, the block self‑hides. Bundle picks deterministically from `related` so no schema change required.
- Analytics: emit `pdp_view`, `pdp_chapter_view`, `pdp_fit_check`, `bundle_add` via existing `track()`.
- SEO: keep `usePageMeta` + add JSON‑LD `Product` schema (name, description, price, availability, image gradient as og fallback).
- Accessibility: each chapter is a `<section>` with heading; sticky bar has `role="region" aria-label`; motion gated by reduced‑motion.

## Out of scope

- No new database tables or migrations (reviews block degrades gracefully).
- No backend / edge function changes.
- No changes to cart, checkout, or webshop listing logic.

## Deliverable

A PDP that feels like a destination, not a form — ambitious motion, real garden context, and a buy bar that's always within reach.
