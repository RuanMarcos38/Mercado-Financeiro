create extension if not exists pgcrypto;

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role text not null default 'user' check (role in ('super_admin','admin','trader','viewer')),
  display_name text,
  created_at timestamptz not null default now()
);
create index if not exists profiles_tenant_idx on profiles(tenant_id);

create table if not exists market_candles (
  id bigserial primary key,
  symbol text not null,
  timeframe text not null,
  bucket timestamptz not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume numeric not null default 0,
  source text not null,
  unique(symbol,timeframe,bucket,source)
);
create index if not exists candles_lookup_idx on market_candles(symbol,timeframe,bucket desc);

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  timeframe text not null,
  generated_at timestamptz not null default now(),
  side text not null check(side in ('COMPRA','VENDA','AGUARDAR')),
  score integer not null,
  confidence integer not null,
  risk text not null,
  model_version text not null,
  reasons jsonb not null default '[]'::jsonb,
  market_snapshot jsonb not null,
  outcome jsonb
);
create index if not exists signals_symbol_time_idx on signals(symbol,generated_at desc);

create table if not exists user_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null,
  symbol text not null,
  timeframe text not null,
  enabled boolean not null default true,
  min_confidence integer not null default 70,
  channels text[] not null default array['push']::text[],
  created_at timestamptz not null default now()
);
create index if not exists alerts_tenant_user_idx on user_alerts(tenant_id,user_id);

create table if not exists report_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null,
  channel text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  payload jsonb not null,
  status text not null default 'queued',
  delivered_at timestamptz
);
create index if not exists report_tenant_time_idx on report_deliveries(tenant_id,period_end desc);

create table if not exists audit_log (
  id bigserial primary key,
  tenant_id uuid,
  actor_id uuid,
  event text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
