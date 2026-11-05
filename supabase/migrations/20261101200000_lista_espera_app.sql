-- Lista de espera de la app de monitoreo JF Monitor (requiere cuenta).
insert into public.permissions (key, description)
values ('interesados.ver', 'Ver la lista de interesados en la app de monitoreo')
on conflict (key) do nothing;
insert into public.role_permissions (role_id, permission_key)
select id, 'interesados.ver' from public.roles where key = 'admin'
on conflict do nothing;

create table if not exists public.app_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  phone text not null check (length(trim(phone)) between 7 and 30),
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  company text check (company is null or length(company) <= 120),
  role text check (role is null or role in ('dueno', 'administrador', 'operador', 'tecnico', 'otro')),
  units_count text check (units_count is null or units_count in ('1', '2-5', '6-10', '11+')),
  site_type text[] not null default '{}',
  signal text check (signal is null or signal in ('buena', 'debil', 'ninguna', 'no_se')),
  plan text check (plan is null or plan in ('esencial', 'vision', 'vision_pro', 'no_se')),
  priorities text[] not null default '{}',
  site_visits text check (site_visits is null or site_visits in ('0', '1-4', '5-10', '11+')),
  budget text check (budget is null or budget in ('lt100', '100-250', '250-500', 'gt500', 'no_se')),
  comments text check (comments is null or length(comments) <= 1000),
  contact_ok boolean not null default true,
  locale text not null default 'es' check (locale in ('es', 'en', 'pt')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger app_waitlist_touch before update on public.app_waitlist
  for each row execute function public.touch_updated_at();
alter table public.app_waitlist enable row level security;

create policy waitlist_own_read on public.app_waitlist for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('interesados.ver')));
create policy waitlist_own_insert on public.app_waitlist for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy waitlist_own_update on public.app_waitlist for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy waitlist_own_delete on public.app_waitlist for delete to authenticated
  using (user_id = (select auth.uid()));

-- Quien ve la lista también ve los datos de contacto de esas cuentas
create policy profiles_read_waitlist on public.profiles for select to authenticated
  using (
    (select private.has_permission('interesados.ver'))
    and exists (select 1 from public.app_waitlist w where w.user_id = profiles.id)
  );
