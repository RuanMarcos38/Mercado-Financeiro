create table if not exists public.notification_preferences (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  whatsapp_e164 text,
  whatsapp_enabled boolean not null default false,
  min_confidence integer not null default 75 check (min_confidence between 0 and 100),
  browser_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_member_read on public.notification_preferences;
create policy notification_preferences_member_read on public.notification_preferences
for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists notification_preferences_admin_write on public.notification_preferences;
create policy notification_preferences_admin_write on public.notification_preferences
for all to authenticated
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));
