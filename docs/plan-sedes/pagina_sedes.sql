-- BORRADOR (no aplicado). Ver docs/04_PLAN_SEDES.md, paso 1: copiar a supabase/migrations/ y pedir aprobación antes de aplicarlo.
-- Página de Sedes: cada sede con mapa de Google, fotos, horario y sus asesores.
-- Todo se edita desde el panel (/admin/sedes y /admin/asesores).

-- Sede: descripción y horario por idioma ({"es": "…", "en": "…", "pt": "…"}; el horario usa la columna «hours»
-- que ya existía), búsqueda para el mapa de Google y fotos (rutas del bucket «sedes», en orden)
alter table public.branches
  add column if not exists description jsonb not null default '{}',
  add column if not exists map_query text check (map_query is null or char_length(map_query) <= 300),
  add column if not exists photos text[] not null default '{}';

-- Asesor: sede, correo público de contacto y si sale en la página de sedes
alter table public.advisors
  add column if not exists branch_id uuid references public.branches (id) on delete set null,
  add column if not exists public_email text check (public_email is null or public_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column if not exists show_on_site boolean not null default true;
create index if not exists advisors_branch_idx on public.advisors (branch_id);

-- Los asesores que ya existen quedan en la primera sede (se cambia en el panel)
update public.advisors
   set branch_id = (select id from public.branches order by sort, name limit 1)
 where branch_id is null;

-- Fotos de sedes y asesores: lectura pública; subir, cambiar y borrar con permiso de empresa o de asesores
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sedes', 'sedes', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists sedes_public_read on storage.objects;
drop policy if exists sedes_staff_insert on storage.objects;
drop policy if exists sedes_staff_update on storage.objects;
drop policy if exists sedes_staff_delete on storage.objects;
create policy sedes_public_read on storage.objects for select
  using (bucket_id = 'sedes');
create policy sedes_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'sedes' and ((select private.has_permission('empresa.editar')) or (select private.has_permission('asesores.gestionar'))));
create policy sedes_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'sedes' and ((select private.has_permission('empresa.editar')) or (select private.has_permission('asesores.gestionar'))))
  with check (bucket_id = 'sedes' and ((select private.has_permission('empresa.editar')) or (select private.has_permission('asesores.gestionar'))));
create policy sedes_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'sedes' and ((select private.has_permission('empresa.editar')) or (select private.has_permission('asesores.gestionar'))));

-- Un asesor puede salir en la página de Sedes sin recibir cotizaciones (active = recibe por WhatsApp)
drop policy if exists advisors_read_site on public.advisors;
create policy advisors_read_site on public.advisors for select
  using (show_on_site and branch_id is not null);

-- WhatsApp desde la tarjeta de un asesor (página de Sedes): se registra el lead como siempre y,
-- si ese asesor recibe cotizaciones (activo), el lead queda con él y se abre su WhatsApp.
-- Si no está activo, se usa el reparto normal (nunca se pierde el cliente).
create or replace function public.lead_create_for(
  p_advisor uuid,
  p_product uuid default null,
  p_catalog text default null,
  p_part_key text default null,
  p_source text default null,
  p_country text default null,
  p_locale text default null,
  p_utm jsonb default '{}',
  p_visitor text default null,
  p_user_agent text default null,
  p_device text default null,
  p_ip_hash text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  a record;
begin
  r := public.lead_create(p_product, p_catalog, p_part_key, p_source, p_country, p_locale, p_utm,
                          p_visitor, p_user_agent, p_device, p_ip_hash);
  select x.id, x.name, x.phone_e164 into a from public.advisors x where x.id = p_advisor and x.active;
  if not found or coalesce((r ->> 'limited')::boolean, false) then return r; end if;
  if r ->> 'lead_id' is not null then
    update public.leads set advisor_id = a.id where id = (r ->> 'lead_id')::uuid;
  end if;
  return r || jsonb_build_object('advisor_id', a.id, 'name', a.name, 'phone', a.phone_e164);
end $$;
revoke execute on function public.lead_create_for(uuid, uuid, text, text, text, text, text, jsonb, text, text, text, text) from public;
grant execute on function public.lead_create_for(uuid, uuid, text, text, text, text, text, jsonb, text, text, text, text) to anon, authenticated;
