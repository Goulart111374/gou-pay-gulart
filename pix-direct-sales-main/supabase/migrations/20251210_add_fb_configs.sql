create table if not exists public.fb_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  pixel_id text not null,
  token_enc text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fb_configs_user_idx on public.fb_configs(user_id);
alter table public.fb_configs enable row level security;

create policy fb_configs_owner_sel on public.fb_configs for select using (auth.uid() = user_id);
create policy fb_configs_owner_ins on public.fb_configs for insert with check (auth.uid() = user_id);
create policy fb_configs_owner_upd on public.fb_configs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy fb_configs_owner_del on public.fb_configs for delete using (auth.uid() = user_id);

create table if not exists public.fb_product_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  fb_config_id uuid not null references public.fb_configs(id) on delete cascade,
  campaign_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fb_product_configs_user_idx on public.fb_product_configs(user_id);
create index if not exists fb_product_configs_product_idx on public.fb_product_configs(product_id);
create unique index if not exists fb_product_configs_unique_active on public.fb_product_configs (user_id, product_id, coalesce(campaign_name, '')) where is_active;

alter table public.fb_product_configs enable row level security;
create policy fb_product_configs_owner_sel on public.fb_product_configs for select using (auth.uid() = user_id);
create policy fb_product_configs_owner_ins on public.fb_product_configs for insert with check (auth.uid() = user_id);
create policy fb_product_configs_owner_upd on public.fb_product_configs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy fb_product_configs_owner_del on public.fb_product_configs for delete using (auth.uid() = user_id);

