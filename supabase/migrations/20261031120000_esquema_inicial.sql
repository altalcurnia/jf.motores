-- =============================================================================
-- JF Motores · Esquema inicial
-- Catálogos, compatibilidades, roles/permisos, asesores, leads, empresa, sedes,
-- unidades vendidas y telemetría (fase 2). RLS en TODAS las tablas.
-- =============================================================================

-- ---------- Tipos ----------
create type public.catalog_type as enum ('motobomba', 'motor', 'repuesto');
create type public.product_status as enum ('borrador', 'disponible', 'vendido');
create type public.lead_status as enum ('nuevo', 'contactado', 'cotizado', 'vendido', 'perdido');
create type public.routing_strategy as enum ('fijo', 'rotacion', 'ponderada', 'eleccion');

-- ---------- Utilidad: updated_at ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- =============================================================================
-- ROLES Y PERMISOS
-- =============================================================================
create table public.roles (
  id smallint generated always as identity primary key,
  key text not null unique,
  name text not null,
  is_internal boolean not null default false,  -- puede entrar al panel
  description text
);

create table public.permissions (
  key text primary key,
  description text not null
);

create table public.role_permissions (
  role_id smallint not null references public.roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role_id, permission_key)
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  country text,
  role_id smallint not null references public.roles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Correos que reciben rol Administrador al crear su cuenta (sin políticas: solo servidor/SQL).
create table public.admin_bootstrap (
  email text primary key
);

-- Rol del usuario actual
create or replace function public.current_role_key()
returns text language sql stable security definer set search_path = '' as $$
  select r.key from public.profiles p join public.roles r on r.id = p.role_id
  where p.id = (select auth.uid())
$$;

-- ¿El usuario actual tiene este permiso?
create or replace function public.has_permission(perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role_id = p.role_id
    where p.id = (select auth.uid()) and rp.permission_key = perm
  )
$$;

-- Perfil automático al registrarse: Administrador si el correo está en admin_bootstrap, si no Cliente.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rid smallint;
begin
  select id into rid from public.roles
  where key = case
    when exists (select 1 from public.admin_bootstrap b where lower(b.email) = lower(new.email)) then 'admin'
    else 'cliente'
  end;
  insert into public.profiles (id, email, full_name, role_id)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', rid);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Solo quien tiene 'usuarios.gestionar' puede cambiar roles (también protege la autoedición del perfil).
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role_id is distinct from old.role_id
     and (select auth.uid()) is not null
     and not (select public.has_permission('usuarios.gestionar')) then
    raise exception 'No tienes permiso para cambiar roles';
  end if;
  return new;
end $$;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();

-- =============================================================================
-- CATÁLOGO
-- =============================================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  catalog public.catalog_type not null,
  parent_id uuid references public.categories (id) on delete set null,
  slug text not null,
  name jsonb not null,                 -- {"es": "...", "en": "...", "pt": "..."}
  description jsonb not null default '{}',
  engine_part_key text unique,         -- pieza del motor 3D que abre esta categoría
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (catalog, slug)
);

create table public.engine_models (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  notes text,
  unique (brand, model)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  catalog public.catalog_type not null,
  category_id uuid references public.categories (id) on delete set null,
  ref text not null unique,
  slug text not null,
  name jsonb not null,
  summary jsonb not null default '{}',
  description jsonb not null default '{}',
  price_cop numeric(14, 0) check (price_cop is null or price_cop >= 0),  -- null = "Consultar precio"
  status public.product_status not null default 'borrador',
  specs jsonb not null default '{}',   -- hp, succion_in, descarga_in, caudal_lpm, cabeza_m, ...
  engine_model_id uuid references public.engine_models (id) on delete set null,
  model_glb_path text,                 -- modelo 3D en Storage
  featured boolean not null default false,
  published_at timestamptz,
  sold_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog, slug)
);
create index products_listing_idx on public.products (catalog, status, published_at desc);
create index products_category_idx on public.products (category_id);
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path text not null,                  -- ruta en Storage o URL absoluta (provisional)
  alt jsonb not null default '{}',
  is_reference boolean not null default false,  -- "Imagen de referencia"
  sort int not null default 0
);
create index product_images_product_idx on public.product_images (product_id, sort);

-- Compatibilidad: un repuesto sirve para un modelo de motor y/o un producto concreto
create table public.part_compatibility (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.products (id) on delete cascade,
  engine_model_id uuid references public.engine_models (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  notes text,
  check (engine_model_id is not null or product_id is not null)
);
create index part_compat_part_idx on public.part_compatibility (part_id);
create index part_compat_model_idx on public.part_compatibility (engine_model_id);
create index part_compat_product_idx on public.part_compatibility (product_id);

-- ¿El producto es visible al público?
create or replace function public.product_is_public(pid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.products p
    where p.id = pid and p.status <> 'borrador' and p.published_at is not null and p.published_at <= now()
  )
$$;

-- =============================================================================
-- UNIDADES VENDIDAS Y TELEMETRÍA (fase 2, estructura lista)
-- =============================================================================
create table public.units (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete set null,
  serial text not null unique,
  owner_id uuid references public.profiles (id) on delete set null,
  sold_at date,
  notes text,
  created_at timestamptz not null default now()
);
create index units_owner_idx on public.units (owner_id);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null unique references public.units (id) on delete cascade,
  key_hash text not null,              -- hash de la clave del dispositivo, nunca la clave
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.telemetry (
  id bigint generated always as identity primary key,
  device_id uuid not null references public.devices (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  data jsonb not null
);
create index telemetry_device_time_idx on public.telemetry (device_id, recorded_at desc);

-- =============================================================================
-- ASESORES, REGLAS Y LEADS
-- =============================================================================
create table public.advisors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,  -- si entra al panel
  name text not null,
  title jsonb not null default '{}',       -- cargo por idioma
  functions jsonb not null default '{}',   -- funciones por idioma
  photo_path text,
  phone_e164 text not null check (phone_e164 ~ '^[1-9][0-9]{7,14}$'),
  languages text[] not null default '{es}',
  countries text[] not null default '{}',  -- vacío = todos
  catalogs public.catalog_type[] not null default '{motobomba,motor,repuesto}',
  schedule jsonb not null default '{}',    -- {"tz":"America/Bogota","days":{"1":["08:00","18:00"],...}}
  weight int not null default 1 check (weight > 0),
  is_fallback boolean not null default false,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index advisors_one_fallback on public.advisors (is_fallback) where is_fallback;
create trigger advisors_touch before update on public.advisors
  for each row execute function public.touch_updated_at();

create table public.routing_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  priority int not null default 100,       -- menor = se evalúa primero
  conditions jsonb not null default '{}',  -- {"catalogs":[...],"countries":[...],"languages":[...],"in_schedule":true}
  strategy public.routing_strategy not null default 'rotacion',
  advisor_ids uuid[] not null default '{}',
  sticky boolean not null default true,    -- cliente recurrente → mismo asesor
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.routing_state (
  rule_id uuid primary key references public.routing_rules (id) on delete cascade,
  last_index int not null default -1
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id uuid references public.products (id) on delete set null,
  catalog public.catalog_type,
  part_key text,
  advisor_id uuid references public.advisors (id) on delete set null,
  rule_id uuid references public.routing_rules (id) on delete set null,
  country text,
  locale text,
  currency text,
  price_shown numeric(16, 2),
  utm jsonb not null default '{}',
  visitor_id text,
  customer_id uuid references public.profiles (id) on delete set null,
  status public.lead_status not null default 'nuevo',
  notes text,
  form_data jsonb not null default '{}',
  user_agent text,
  updated_at timestamptz not null default now()
);
create index leads_created_idx on public.leads (created_at desc);
create index leads_advisor_idx on public.leads (advisor_id, created_at desc);
create index leads_visitor_idx on public.leads (visitor_id);
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- EMPRESA, SEDES, PRECIOS, FORMULARIOS, AUDITORÍA
-- =============================================================================
create table public.company_settings (
  id boolean primary key default true check (id),  -- fila única
  trade_name text not null default 'JF Motores',
  legal_name text,
  nit text,
  texts jsonb not null default '{}',     -- eslogan, garantía, "quiénes somos" por idioma
  stats jsonb not null default '[]',     -- [{"value":"+300","label":{"es":"Equipos entregados"}}]
  socials jsonb not null default '{}',
  email text,
  updated_at timestamptz not null default now()
);
create trigger company_touch before update on public.company_settings
  for each row execute function public.touch_updated_at();

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  country text not null default 'CO',
  address text,
  phone text,
  hours jsonb not null default '{}',
  lat double precision,
  lng double precision,
  active boolean not null default true,
  sort int not null default 0
);

create table public.exchange_rates (
  currency text primary key check (currency ~ '^[A-Z]{3}$'),
  per_cop numeric(20, 10) not null check (per_cop > 0),  -- unidades de esa moneda por 1 COP
  is_manual boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  placement text not null default 'before_whatsapp',
  fields jsonb not null default '[]',
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  table_name text not null,
  record_id text,
  action text not null,
  diff jsonb
);

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.admin_bootstrap enable row level security;
alter table public.categories enable row level security;
alter table public.engine_models enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.part_compatibility enable row level security;
alter table public.units enable row level security;
alter table public.devices enable row level security;
alter table public.telemetry enable row level security;
alter table public.advisors enable row level security;
alter table public.routing_rules enable row level security;
alter table public.routing_state enable row level security;
alter table public.leads enable row level security;
alter table public.company_settings enable row level security;
alter table public.branches enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.forms enable row level security;
alter table public.audit_log enable row level security;

-- Roles y permisos: lectura para usuarios con sesión; gestión solo con permiso
create policy roles_read on public.roles for select to authenticated using (true);
create policy roles_write on public.roles for all to authenticated
  using ((select public.has_permission('usuarios.gestionar'))) with check ((select public.has_permission('usuarios.gestionar')));
create policy perms_read on public.permissions for select to authenticated using (true);
create policy role_perms_read on public.role_permissions for select to authenticated using (true);
create policy role_perms_write on public.role_permissions for all to authenticated
  using ((select public.has_permission('usuarios.gestionar'))) with check ((select public.has_permission('usuarios.gestionar')));

-- Perfiles: cada uno ve y edita el suyo; con permiso, todos
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.has_permission('usuarios.ver')));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_admin_write on public.profiles for update to authenticated
  using ((select public.has_permission('usuarios.gestionar'))) with check ((select public.has_permission('usuarios.gestionar')));

-- Catálogo: público solo lo publicado; personal interno con permiso ve todo
create policy categories_read on public.categories for select
  using (active or (select public.has_permission('catalogo.ver')));
create policy categories_write on public.categories for all to authenticated
  using ((select public.has_permission('catalogo.editar'))) with check ((select public.has_permission('catalogo.editar')));

create policy engine_models_read on public.engine_models for select using (true);
create policy engine_models_write on public.engine_models for all to authenticated
  using ((select public.has_permission('catalogo.editar'))) with check ((select public.has_permission('catalogo.editar')));

create policy products_read on public.products for select
  using (
    (status <> 'borrador' and published_at is not null and published_at <= now())
    or (select public.has_permission('catalogo.ver'))
  );
create policy products_write on public.products for all to authenticated
  using ((select public.has_permission('catalogo.editar'))) with check ((select public.has_permission('catalogo.editar')));

create policy product_images_read on public.product_images for select
  using (public.product_is_public(product_id) or (select public.has_permission('catalogo.ver')));
create policy product_images_write on public.product_images for all to authenticated
  using ((select public.has_permission('catalogo.editar'))) with check ((select public.has_permission('catalogo.editar')));

create policy part_compat_read on public.part_compatibility for select
  using (public.product_is_public(part_id) or (select public.has_permission('catalogo.ver')));
create policy part_compat_write on public.part_compatibility for all to authenticated
  using ((select public.has_permission('catalogo.editar'))) with check ((select public.has_permission('catalogo.editar')));

-- Unidades y telemetría: solo el propietario y quien tenga permiso
create policy units_read on public.units for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.has_permission('equipos.ver')));
create policy units_write on public.units for all to authenticated
  using ((select public.has_permission('equipos.gestionar'))) with check ((select public.has_permission('equipos.gestionar')));
create policy devices_read on public.devices for select to authenticated
  using ((select public.has_permission('telemetria.ver')));
create policy devices_write on public.devices for all to authenticated
  using ((select public.has_permission('equipos.gestionar'))) with check ((select public.has_permission('equipos.gestionar')));
create policy telemetry_read on public.telemetry for select to authenticated
  using (
    (select public.has_permission('telemetria.ver'))
    or exists (
      select 1 from public.devices d join public.units u on u.id = d.unit_id
      where d.id = telemetry.device_id and u.owner_id = (select auth.uid())
    )
  );
-- (la escritura de telemetría la hace el servidor con la clave secreta)

-- Asesores: datos públicos de contacto; gestión con permiso
create policy advisors_read on public.advisors for select
  using (active or (select public.has_permission('asesores.gestionar')));
create policy advisors_write on public.advisors for all to authenticated
  using ((select public.has_permission('asesores.gestionar'))) with check ((select public.has_permission('asesores.gestionar')));
create policy routing_rules_all on public.routing_rules for all to authenticated
  using ((select public.has_permission('asesores.gestionar'))) with check ((select public.has_permission('asesores.gestionar')));
create policy routing_state_read on public.routing_state for select to authenticated
  using ((select public.has_permission('asesores.gestionar')));

-- Leads: se crean desde el servidor; el asesor ve los suyos, con permiso todos
create policy leads_read on public.leads for select to authenticated
  using (
    (select public.has_permission('leads.ver_todos'))
    or exists (select 1 from public.advisors a where a.id = leads.advisor_id and a.profile_id = (select auth.uid()))
    or customer_id = (select auth.uid())
  );
create policy leads_update on public.leads for update to authenticated
  using (
    (select public.has_permission('leads.gestionar'))
    or exists (select 1 from public.advisors a where a.id = leads.advisor_id and a.profile_id = (select auth.uid()))
  )
  with check (
    (select public.has_permission('leads.gestionar'))
    or exists (select 1 from public.advisors a where a.id = leads.advisor_id and a.profile_id = (select auth.uid()))
  );

-- Empresa, sedes, tasas, formularios: lectura pública; escritura con permiso
create policy company_read on public.company_settings for select using (true);
create policy company_write on public.company_settings for update to authenticated
  using ((select public.has_permission('empresa.editar'))) with check ((select public.has_permission('empresa.editar')));
create policy branches_read on public.branches for select using (active or (select public.has_permission('empresa.editar')));
create policy branches_write on public.branches for all to authenticated
  using ((select public.has_permission('empresa.editar'))) with check ((select public.has_permission('empresa.editar')));
create policy rates_read on public.exchange_rates for select using (true);
create policy rates_write on public.exchange_rates for all to authenticated
  using ((select public.has_permission('precios.editar'))) with check ((select public.has_permission('precios.editar')));
create policy forms_read on public.forms for select using (active or (select public.has_permission('formularios.gestionar')));
create policy forms_write on public.forms for all to authenticated
  using ((select public.has_permission('formularios.gestionar'))) with check ((select public.has_permission('formularios.gestionar')));
create policy audit_read on public.audit_log for select to authenticated
  using ((select public.has_permission('auditoria.ver')));

-- =============================================================================
-- STORAGE: imágenes y modelos 3D del catálogo
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalogo', 'catalogo', true, 15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'model/gltf-binary', 'application/octet-stream']
)
on conflict (id) do nothing;

create policy catalogo_public_read on storage.objects for select
  using (bucket_id = 'catalogo');
create policy catalogo_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'catalogo' and (select public.has_permission('catalogo.editar')));
create policy catalogo_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'catalogo' and (select public.has_permission('catalogo.editar')));
create policy catalogo_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'catalogo' and (select public.has_permission('catalogo.editar')));
