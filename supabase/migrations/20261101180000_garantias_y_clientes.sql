-- Garantía (opcional) por producto y por unidad vendida, y lista de clientes para el panel de ventas.

alter table public.products
  add column if not exists warranty_months smallint check (warranty_months is null or warranty_months between 1 and 120);

alter table public.units
  add column if not exists warranty_start date,
  add column if not exists warranty_end date;
alter table public.units drop constraint if exists units_warranty_check;
alter table public.units add constraint units_warranty_check
  check ((warranty_start is null and warranty_end is null) or (warranty_start is not null and warranty_end >= warranty_start));

-- Lista de cuentas (correo y nombre) para elegir al cliente al registrar una venta
create or replace function public.list_customers()
returns table (id uuid, email text, full_name text, phone text, purchases bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.has_permission('equipos.gestionar')) then
    raise exception 'No tienes permiso para registrar ventas';
  end if;
  return query
    select p.id, p.email, p.full_name, p.phone, (select count(*) from public.units u where u.owner_id = p.id)
      from public.profiles p
     order by lower(p.email);
end $$;

-- register_sale con garantía en meses (null o 0 = sin garantía)
drop function if exists public.register_sale(uuid, text, text, numeric, text, date, text, boolean);
create or replace function public.register_sale(
  product uuid,
  customer_email text,
  serial text default null,
  price_cop numeric default null,
  channel text default 'presencial',
  sold_on date default null,
  notes text default null,
  mark_sold boolean default true,
  warranty_months int default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  buyer uuid;
  cat public.catalog_type;
  unit_id uuid;
  s text := nullif(upper(trim(coalesce(serial, ''))), '');
  d date := coalesce(sold_on, (now() at time zone 'America/Bogota')::date);
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
  if warranty_months is not null and (warranty_months < 0 or warranty_months > 120) then
    raise exception 'La garantía debe estar entre 0 y 120 meses';
  end if;

  insert into public.units (product_id, serial, owner_id, sold_at, notes, price_cop, channel, sold_by, warranty_start, warranty_end)
  values (product, s, buyer, d, nullif(left(trim(coalesce(notes, '')), 500), ''), price_cop, channel, (select auth.uid()),
          case when coalesce(warranty_months, 0) > 0 then d end,
          case when coalesce(warranty_months, 0) > 0 then (d + make_interval(months => warranty_months) - interval '1 day')::date end)
  returning id into unit_id;

  if mark_sold then
    update public.products
       set status = 'vendido', sold_at = now(), published_at = coalesce(published_at, now())
     where id = product and status <> 'vendido';
  end if;

  insert into public.audit_log (actor, table_name, record_id, action, diff)
  values ((select auth.uid()), 'units', unit_id::text, 'sale',
          jsonb_build_object('product', product, 'buyer', buyer, 'serial', s, 'channel', channel,
                             'price_cop', price_cop, 'warranty_months', warranty_months));
  return unit_id;
end $$;

-- Ajustar la garantía de una venta ya registrada
create or replace function public.set_unit_warranty(unit uuid, starts date, months int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (select private.has_permission('equipos.gestionar')) then
    raise exception 'No tienes permiso para editar ventas';
  end if;
  if months is not null and (months < 0 or months > 120) then raise exception 'La garantía debe estar entre 0 y 120 meses'; end if;
  update public.units
     set warranty_start = case when coalesce(months, 0) > 0 then starts end,
         warranty_end = case when coalesce(months, 0) > 0 then (starts + make_interval(months => months) - interval '1 day')::date end
   where id = unit;
  if not found then raise exception 'La venta no existe'; end if;
  insert into public.audit_log (actor, table_name, record_id, action, diff)
  values ((select auth.uid()), 'units', unit::text, 'warranty', jsonb_build_object('starts', starts, 'months', months));
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.list_customers()',
    'public.register_sale(uuid, text, text, numeric, text, date, text, boolean, int)',
    'public.set_unit_warranty(uuid, date, int)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
