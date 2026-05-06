create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.wishlists enable row level security;
create policy "own wish select" on public.wishlists for select to authenticated using (auth.uid() = user_id);
create policy "own wish insert" on public.wishlists for insert to authenticated with check (auth.uid() = user_id);
create policy "own wish delete" on public.wishlists for delete to authenticated using (auth.uid() = user_id);
create index wishlists_user_idx on public.wishlists(user_id);