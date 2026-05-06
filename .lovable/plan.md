
# Havelandet — Functionality & UX Upgrade Plan

A sequenced, ambitious roadmap. Each sequence is shippable on its own, so we can stop, review, and adjust between them. Nothing here changes the front-page 3D scene's identity — only adds polish around it.

---

## Sequence 1 — Foundations: navigation, search, global polish
Goal: make the site feel like one product, not five pages.

1. **Unified site chrome**
   - Merge `SiteNav` + `AppNav` into one `SiteChrome` that adapts (transparent on hero, solid elsewhere).
   - Add a slim sticky sub-bar on inner pages with breadcrumb + page actions (e.g. cart, save).
2. **Global command palette / search (⌘K)**
   - Searches: products, tools, plants catalog, account pages, recent orders.
   - Mobile: full-screen sheet triggered by the existing "Søg" button + a search icon in `MobileTabBar`.
3. **Cart & auth state visible everywhere**
   - Cart badge with count in both desktop nav and mobile tabbar.
   - Auth-aware "Min konto" → shows avatar + name when logged in, "Log ind" when not.
4. **Page transitions + skeletons**
   - Replace "Henter sortiment…" text with proper skeleton cards.
   - Add subtle fade/slide transitions between routes (respect `prefers-reduced-motion`).
5. **SEO + meta**
   - Per-page `<title>`, meta description, OG image, JSON-LD (Product, BreadcrumbList, Organization).
   - Single H1 audit, alt text pass, canonical tags.

---

## Sequence 2 — Webshop that converts
Goal: turn the shop from a list into a real store.

1. **Filtering & sorting**
   - Sidebar (desktop) / sheet (mobile) with: price range, in-stock, category, "passer til min have" (uses saved garden size).
   - Sort: nyhed, pris ↑/↓, mest populære.
2. **Product detail upgrades**
   - Image gallery, variant picker, qty stepper, sticky "Læg i kurv" on mobile.
   - "Passer til din have" badge when product matches user's measured area / climate.
   - Related products + recently viewed (localStorage).
3. **Cart & checkout flow**
   - Slide-over mini-cart from any page.
   - Real checkout: address (autofill from profile), shipping options, order summary, confirmation page.
   - Order history under `/konto`.
4. **Wishlist / favorites** (per-user table) usable from product cards.
5. **Stock + price formatting** consistent (DKK, "Udsolgt" pill, "Få på lager" warning).

---

## Sequence 3 — Tools that talk to each other
Goal: Havemåler → Vanding → AI as one connected workflow, not three islands.

1. **"Min have" hub on `/konto`**
   - Cards for each garden: thumbnail, area, zones, devices, next watering.
   - One-click "Brug denne have" sets active garden across all tools.
2. **Havemåler improvements**
   - Save multiple gardens, name + edit polygons, exclude obstacles (already in schema).
   - Result page recommends robot + sprinklers from the shop directly.
3. **Vandingsplan**
   - Visual week calendar per zone, drag to edit.
   - Weather-aware preview ("springes over onsdag pga. regn").
   - Push/email reminders (Lovable Cloud edge function + cron).
4. **Plantepleje AI**
   - Conversation history sidebar (table already exists).
   - Image upload for plant diagnosis (Lovable AI vision model).
   - Quick-actions: "Tilføj til min have", "Lav vandingsplan", "Find i shop".
5. **Cross-tool deep links**: AI answer → "Opret vandingsplan for dette bed" prefilled.

---

## Sequence 4 — Account, identity, retention
1. **Auth polish**: Google sign-in, magic link option, password reset flow QA, session-persist tested.
2. **Profile**: name, address (used for shipping + weather), avatar upload to existing `garden-thumbnails` bucket (or new `avatars`).
3. **Notifications center**: vandingshændelser, ordrestatus, sæsonpåmindelser.
4. **Onboarding** (first login): 3-step wizard — opmål have → vælg planter → første vandingsplan. Skippable.
5. **Roles**: admin dashboard at `/admin` (gated by `has_role`) for products, orders, plants catalog CRUD.

---

## Sequence 5 — Performance, quality, trust
1. **Code-split** every route + lazy-load the 3D scene (`React.lazy` + `Suspense`).
2. **Image pipeline**: `<picture>` + AVIF/WebP, `loading="lazy"`, explicit dimensions to kill CLS.
3. **Error boundaries** per route + a friendly 404/500.
4. **Accessibility**: focus rings, skip-link, aria on tabbar, color-contrast audit on dark hero.
5. **Analytics**: lightweight event tracking (page views, add-to-cart, tool completions).
6. **Tests**: vitest for cart math, formatting, route guards; smoke test the AI edge function.

---

## Technical notes (for the curious)

- Frontend only where possible; backend additions limited to: `wishlists`, `notifications`, `addresses`, optional `recently_viewed`, plus an edge function for weather-aware schedule recompute and one for order confirmation emails.
- All new tables get RLS mirroring the existing `own X` policy pattern.
- AI features use Lovable AI Gateway (`google/gemini-2.5-flash` for chat, `google/gemini-2.5-pro` for vision diagnosis).
- No changes to `scene.js` behavior beyond lazy-loading it.

---

## Suggested order of execution
Ship Sequence 1 first (it unblocks everything else visually), then 2 (revenue), then 3 (the differentiator), then 4 + 5 in parallel.

Tell me which sequence to start on — or pick specific items across sequences and I'll bundle them into the first build.
