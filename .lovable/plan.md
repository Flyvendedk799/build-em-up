# Full Admin CMS — Ambitious Build

Transform `/admin` from a minimal dashboard into a proper headless CMS for the entire shop, plant catalog, orders, users, content and media. Built as a sidebar app at `/admin/*` with role-gated routes.

## Architecture

```text
/admin
  ├── /              Dashboard (KPIs, charts, recent activity)
  ├── /products      List + filters + bulk actions
  │   └── /:id       Editor (details, variants, media, SEO, inventory)
  ├── /plants        plants_catalog list
  │   └── /:slug     Plant editor
  ├── /orders        List + filters
  │   └── /:id       Order detail (items, customer, shipping, status, refund note)
  ├── /users         User list + role management
  │   └── /:id       Profile + roles + orders
  ├── /media         Storage browser (avatars, garden-thumbnails, new product-media)
  ├── /content       Hero, featured, banners, FAQ, pages (key/value content blocks)
  ├── /notifications Broadcast composer (insert into notifications per user / segment)
  ├── /analytics     Sales, top products, conversion, traffic
  └── /audit         Audit log viewer
```

Shared shell: `AdminLayout` with shadcn `Sidebar` (collapsible icon mode), header with breadcrumb + global search + user menu. Route guard via `has_role(uid, 'admin')`.

## Database changes

New tables:
- `content_blocks` — `key text pk`, `value jsonb`, `updated_by uuid`, timestamps. Public read, admin write.
- `audit_log` — `id`, `actor_id`, `action text`, `entity text`, `entity_id text`, `diff jsonb`, `created_at`. Admin read only; inserted via triggers + edge function.
- `product_media` — `id`, `product_id`, `url`, `alt`, `sort`, `is_primary`. Public read, admin write.
- `product_inventory` — extend `product_variants` with `stock_qty int`, `low_stock_threshold int`, `track_inventory bool`.
- `orders` — add `shipping_status`, `tracking_number`, `notes`, `refunded_at`. Add admin UPDATE policy.
- `order_items` — add admin SELECT policy (so admins can see all line items).
- `profiles` — add admin SELECT policy via `has_role`.

New storage bucket: `product-media` (public). RLS: admin write, public read.

Triggers: `audit_trigger()` on products / variants / plants / orders writing to `audit_log`.

Helper view (optional): `admin_order_summary` joining orders + profile + item count.

## Sequence breakdown

### Sequence 1 — Shell, Dashboard, Products CRUD
- Migration: `product_media`, inventory cols, `audit_log` skeleton, `product-media` bucket + policies, admin policies on orders/profiles/order_items.
- `AdminLayout` with sidebar, route guard, breadcrumbs.
- Dashboard: KPI cards (revenue 30d, orders 30d, avg order, low stock count), recharts line chart of orders/day, recent orders table, top 5 products.
- `/admin/products` list: search, category filter, stock filter, featured toggle, bulk delete/feature, pagination.
- `/admin/products/:id` editor: tabs (Details, Variants, Media, SEO, Inventory). Drag-drop image upload to `product-media` bucket. Variant table with inline edit. Slug auto-gen. Markdown description.

### Sequence 2 — Plants, Orders, Users
- `/admin/plants` list + editor mirroring products (image upload, sow/harvest month pickers, sun/water selects).
- `/admin/orders` list with status filter, date range, customer search, CSV export.
- `/admin/orders/:id` detail: line items, customer card, shipping address, status workflow (pending → paid → packed → shipped → delivered), tracking number, internal notes, refund button (status only — no payment integration).
- `/admin/users` list (joined profiles + auth via edge function using service role). Assign/remove `admin` / `moderator` roles. View user's orders, gardens, plants from a single page.

### Sequence 3 — Media, Content, Notifications
- `/admin/media`: grid browser for all storage buckets with upload, rename (copy+delete), delete, copy-URL. Filter by bucket.
- `/admin/content`: editable blocks for hero copy, featured product IDs, homepage banners, FAQ entries, footer links — driven by `content_blocks` table; frontend reads via a `useContentBlock(key)` hook.
- `/admin/notifications`: composer with title/body/link, audience selector (all users, specific user, role). Sends via edge function using service role to insert into `notifications`.

### Sequence 4 — Analytics, Audit, Polish
- `/admin/analytics`: revenue chart (day/week/month toggle), top products bar chart, category split donut, conversion funnel (visits → cart → checkout → paid using `analytics.ts` events stored in a new `events` table), low-stock alerts.
- `/admin/audit`: filterable log of who changed what; diff viewer.
- Audit triggers wired on products, variants, plants, orders.
- Global keyboard shortcut `g a` to jump into admin; command palette entries for admin actions.
- Empty states, loading skeletons, error boundaries, confirm dialogs on destructive actions.
- E2E smoke test for admin product create→edit→delete flow.

## Technical notes
- Edge functions needed:
  - `admin-list-users` (service role, lists auth users + joins profiles/roles).
  - `admin-set-role` (service role, validates caller is admin, inserts/deletes `user_roles`).
  - `admin-broadcast-notification` (insert per recipient).
  - `admin-export-orders` (CSV stream).
  All validate caller via JWT + `has_role` check.
- Reuse shadcn `Table`, `Sheet`, `Dialog`, `Form`, `Sidebar`, `Tabs`. Charts via `recharts` (already in project).
- Image uploads: client-side resize to max 1600px, upload to `product-media`, store URL on `product_media` row.
- All admin mutations call `audit-log` insert (or rely on DB triggers).
- Strict zod validation on every form.
- No payment / Stripe work in this plan — refunds are status-only.

## Out of scope (future)
- Real payment refunds, shipping label generation, multi-language content, A/B testing, customer segments beyond role.
