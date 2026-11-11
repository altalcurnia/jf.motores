-- Ventas registradas y guías de usuario (PDF).
-- Toda venta (por la página, en persona o por WhatsApp) se registra en el panel y
-- exige que el cliente tenga cuenta: la unidad queda a su nombre y ve su guía.

-- -------------------------------------------------------------- Unidades vendidas
alter table public.units alter column serial drop not null;  -- los repuestos pueden no tener serie
alter table public.units
  add column if not exists price_cop numeric(14, 0) check (price_cop is null or price_cop >= 0),
  add column if not exists channel text not null default 'presencial'
    check (channel in ('presencial', 'whatsapp', 'web', 'otro')),
  add column if not exists sold_by uuid references public.profiles (id) on delete set null;
create index if not exists units_product_idx on public.units (product_id);
create index if not exists units_sold_at_idx on public.units (sold_at desc);

-- El personal que ve ventas puede ver los datos de contacto de sus compradores
create policy profiles_read_customers on public.profiles for select to authenticated
  using (
    (select private.has_permission('equipos.ver'))
    and exists (select 1 from public.units u where u.owner_id = profiles.id)
  );

-- -------------------------------------------------------------- Guía de usuario por producto
alter table public.products
  add column if not exists manual_path text,
  add column if not exists manual_public boolean not null default false;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('manuales', 'manuales', false, 31457280, array['application/pdf'])
on conflict (id) do nothing;

-- Pueden descargarla: el personal con catálogo, los dueños de una unidad de ese producto,
-- y cualquiera si el producto está publicado con la guía marcada como pública.
create policy manuales_read on storage.objects for select
  using (
    bucket_id = 'manuales' and (
      (select private.has_permission('catalogo.ver'))
      or exists (
        select 1 from public.units u join public.products p on p.id = u.product_id
        where u.owner_id = (select auth.uid()) and p.manual_path = storage.objects.name
      )
      or exists (
        select 1 from public.products p
        where p.manual_path = storage.objects.name and p.manual_public
          and p.status <> 'borrador' and p.published_at is not null and p.published_at <= now()
      )
    )
  );
create policy manuales_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'manuales' and (select private.has_permission('catalogo.editar')));
create policy manuales_update on storage.objects for update to authenticated
  using (bucket_id = 'manuales' and (select private.has_permission('catalogo.editar')));
create policy manuales_delete on storage.objects for delete to authenticated
  using (bucket_id = 'manuales' and (select private.has_permission('catalogo.editar')));

-- -------------------------------------------------------------- Buscar cliente por correo exacto
-- Solo por correo completo (no lista clientes), para quien registra ventas.
create or replace function public.find_customer(customer_email text)
returns table (id uuid, full_name text, email text, phone text, country text, purchases bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.has_permission('equipos.gestionar')) then
    raise exception 'No tienes permiso para registrar ventas';
  end if;
  return query
    select p.id, p.full_name, p.email, p.phone, p.country,
           (select count(*) from public.units u where u.owner_id = p.id)
      from public.profiles p
     where lower(p.email) = lower(trim(customer_email));
end $$;

-- -------------------------------------------------------------- Registrar una venta
create or replace function public.register_sale(
  product uuid,
  customer_email text,
  serial text default null,
  price_cop numeric default null,
  channel text default 'presencial',
  sold_on date default null,
  notes text default null,
  mark_sold boolean default true
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  buyer uuid;
  cat public.catalog_type;
  unit_id uuid;
  s text := nullif(upper(trim(coalesce(serial, ''))), '');
begin
  if not (select private.has_permission('equipos.gestionar')) then
    raise exception 'No tienes permiso para registrar ventas';
  end if;
  select p.catalog into cat from public.products p where p.id = product;
  if cat is null then raise exception 'El producto no existe'; end if;
  select p.id into buyer from public.profiles p where lower(p.email) = lower(trim(coalesce(customer_email, '')));
  if buyer is null then
    raise exception 'Ese correo no tiene cuenta. El cliente debe crearla en la página antes de registrar la venta.'
      using hint = 'no_account';
  end if;
  if cat in ('motobomba', 'motor') and s is null then
    raise exception 'Escribe el número de serie del equipo';
  end if;
  if s is not null and exists (select 1 from public.units u where u.serial = s) then
    raise exception 'Ya hay una venta registrada con la serie %', s;
  end if;
  if channel not in ('presencial', 'whatsapp', 'web', 'otro') then raise exception 'Canal inválido'; end if;

  insert into public.units (product_id, serial, owner_id, sold_at, notes, price_cop, channel, sold_by)
  values (product, s, buyer, coalesce(sold_on, (now() at time zone 'America/Bogota')::date),
          nullif(left(trim(coalesce(notes, '')), 500), ''), price_cop, channel, (select auth.uid()))
  returning id into unit_id;

  if mark_sold then
    update public.products
       set status = 'vendido', sold_at = now(), published_at = coalesce(published_at, now())
     where id = product and status <> 'vendido';
  end if;

  insert into public.audit_log (actor, table_name, record_id, action, diff)
  values ((select auth.uid()), 'units', unit_id::text, 'sale',
          jsonb_build_object('product', product, 'buyer', buyer, 'serial', s, 'channel', channel, 'price_cop', price_cop));
  return unit_id;
end $$;

-- Anular una venta registrada por error (queda en el historial)
create or replace function public.delete_sale(unit uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare old jsonb;
begin
  if not (select private.has_permission('equipos.gestionar')) then
    raise exception 'No tienes permiso para anular ventas';
  end if;
  select to_jsonb(u) into old from public.units u where u.id = unit;
  if old is null then raise exception 'La venta no existe'; end if;
  if exists (select 1 from public.devices d where d.unit_id = unit) then
    raise exception 'Esta unidad tiene un dispositivo de telemetría conectado';
  end if;
  delete from public.units where id = unit;
  insert into public.audit_log (actor, table_name, record_id, action, diff)
  values ((select auth.uid()), 'units', unit::text, 'void_sale', old);
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.find_customer(text)',
    'public.register_sale(uuid, text, text, numeric, text, date, text, boolean)',
    'public.delete_sale(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
