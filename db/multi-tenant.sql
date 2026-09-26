-- MercadoAI multiempresa - compatível com o schema existente
create table if not exists tenant_memberships (
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'viewer' check (role in ('owner','admin','trader','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (tenant_id,user_id)
);
create index if not exists tenant_memberships_user_idx on tenant_memberships(user_id,active);

create table if not exists tenant_audit_log (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid,
  event text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists tenant_audit_log_tenant_time_idx on tenant_audit_log(tenant_id,created_at desc);

alter table tenant_memberships enable row level security;
alter table tenant_audit_log enable row level security;

-- Usuários autenticados só enxergam memberships dos tenants aos quais pertencem.
drop policy if exists memberships_read_own_tenant on tenant_memberships;
create policy memberships_read_own_tenant on tenant_memberships
for select using (
  user_id = auth.uid()
  or tenant_id in (
    select tm.tenant_id from tenant_memberships tm where tm.user_id = auth.uid() and tm.active = true
  )
);

drop policy if exists tenant_audit_read_own_tenant on tenant_audit_log;
create policy tenant_audit_read_own_tenant on tenant_audit_log
for select using (
  tenant_id in (
    select tm.tenant_id from tenant_memberships tm where tm.user_id = auth.uid() and tm.active = true
  )
);
