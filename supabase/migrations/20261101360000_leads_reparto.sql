-- Leads y reparto entre asesores (RF-06 / RF-07).
-- Cada clic a WhatsApp pasa por el servidor, que llama a lead_create(): registra el lead
-- (producto, fuente, país, idioma, campaña, dispositivo) y devuelve el asesor asignado.
-- Orden del reparto: cliente recurrente → reglas por prioridad → asesor de respaldo.

alter table public.leads
  add column if not exists source text,
  add column if not exists device text,
  add column if not exists ip_hash text,
  add column if not exists code text generated always as (upper(substr(replace(id::text, '-', ''), 1, 6))) stored;
create index if not exists leads_status_idx on public.leads (status, created_at desc);
create index if not exists leads_ip_idx on public.leads (ip_hash, created_at desc);

-- Regla por defecto: rotación entre todos los asesores activos (advisor_ids vacío = todos)
insert into public.routing_rules (name, priority, conditions, strategy, advisor_ids, sticky, active)
select 'Rotación general', 1000, '{}', 'rotacion', '{}', true, true
 where not exists (select 1 from public.routing_rules);

-- ¿El asesor está en turno? Horario {"tz":"America/Bogota","days":{"1":["08:00","18:00"],...}} (1 = lunes).
-- Sin horario configurado = siempre en turno.
create or replace function private.advisor_on_duty(schedule jsonb)
returns boolean language plpgsql stable set search_path = '' as $$
declare
  tz text := coalesce(nullif(schedule ->> 'tz', ''), 'America/Bogota');
  local timestamp;
  slot jsonb;
begin
  if schedule is null or coalesce(schedule -> 'days', '{}'::jsonb) = '{}'::jsonb then return true; end if;
  local := now() at time zone tz;
  slot := schedule -> 'days' -> extract(isodow from local)::int::text;
  if slot is null or jsonb_array_length(slot) < 2 then return false; end if;
  return local::time >= (slot ->> 0)::time and local::time < (slot ->> 1)::time;
exception when others then
  return true;
end $$;
revoke execute on function private.advisor_on_duty(jsonb) from public, anon, authenticated;

-- Registra el lead y elige el asesor. Devuelve {lead_id, code, advisor_id, name, phone}.
create or replace function public.lead_create(
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
  uid uuid := (select auth.uid());
  visitor text := case when p_visitor ~ '^[A-Za-z0-9-]{8,64}$' then p_visitor end;
  ip text := case when p_ip_hash ~ '^[a-f0-9]{16,64}$' then p_ip_hash end;
  cat public.catalog_type;
  country text := upper(left(coalesce(p_country, ''), 2));
  lang text := case when p_locale in ('es', 'en', 'pt') then p_locale end;
  src text := left(coalesce(p_source, 'web'), 30);
  prev public.leads;
  r public.routing_rules;
  cands uuid[];
  filtered uuid[];
  n int;
  idx int;
  total int;
  acc int;
  a record;
  adv uuid;
  rule_used uuid;
  lid uuid;
  lcode text;
begin
  -- Catálogo: el del producto si es público; si no, el que llega
  if p_product is not null then
    select p.catalog into cat from public.products p
     where p.id = p_product and p.status in ('disponible', 'vendido');
    if not found then p_product := null; end if;
  end if;
  if cat is null and p_catalog in ('motobomba', 'motor', 'repuesto') then cat := p_catalog::public.catalog_type; end if;
  if country !~ '^[A-Z]{2}$' then country := null; end if;

  -- Mismo visitante, mismo producto y misma fuente en 20 minutos: se reutiliza el lead
  if visitor is not null or uid is not null then
    select * into prev from public.leads l
     where (l.visitor_id = visitor or (uid is not null and l.customer_id = uid))
       and l.product_id is not distinct from p_product
       and l.source is not distinct from src
       and l.created_at > now() - interval '20 minutes'
     order by l.created_at desc limit 1;
    if found and exists (select 1 from public.advisors x where x.id = prev.advisor_id and x.active) then
      select x.name, x.phone_e164 into a from public.advisors x where x.id = prev.advisor_id;
      return jsonb_build_object('lead_id', prev.id, 'code', prev.code, 'advisor_id', prev.advisor_id, 'name', a.name, 'phone', a.phone_e164, 'reused', true);
    end if;
  end if;

  -- Freno a abusos: máximo 30 leads por hora por visitante o por IP
  if (visitor is not null and (select count(*) from public.leads where visitor_id = visitor and created_at > now() - interval '1 hour') >= 30)
     or (ip is not null and (select count(*) from public.leads where ip_hash = ip and created_at > now() - interval '1 hour') >= 30) then
    select x.id, x.name, x.phone_e164 into a from public.advisors x where x.active order by x.is_fallback desc, x.sort limit 1;
    return jsonb_build_object('lead_id', null, 'advisor_id', a.id, 'name', a.name, 'phone', a.phone_e164, 'limited', true);
  end if;

  -- 1) Cliente recurrente: el mismo asesor de su último lead (180 días), si sigue activo
  select l.advisor_id into adv from public.leads l
    join public.advisors x on x.id = l.advisor_id and x.active
   where ((visitor is not null and l.visitor_id = visitor) or (uid is not null and l.customer_id = uid))
     and l.created_at > now() - interval '180 days'
   order by l.created_at desc limit 1;

  -- 2) Reglas por prioridad (gana la primera que aplica y tiene asesores disponibles)
  if adv is null then
    for r in select * from public.routing_rules where active order by priority, created_at loop
      if jsonb_array_length(coalesce(r.conditions -> 'catalogs', '[]')) > 0
         and (cat is null or not (r.conditions -> 'catalogs') ? cat::text) then continue; end if;
      if jsonb_array_length(coalesce(r.conditions -> 'countries', '[]')) > 0
         and (country is null or not (r.conditions -> 'countries') ? country) then continue; end if;
      if jsonb_array_length(coalesce(r.conditions -> 'languages', '[]')) > 0
         and (lang is null or not (r.conditions -> 'languages') ? lang) then continue; end if;

      -- Candidatos: los de la regla (o todos si está vacía), activos y, si se pide, en turno
      select array_agg(x.id order by array_position(r.advisor_ids, x.id), x.sort, x.created_at) into cands
        from public.advisors x
       where x.active
         and (cardinality(r.advisor_ids) = 0 or x.id = any (r.advisor_ids))
         and (not coalesce((r.conditions ->> 'in_schedule')::boolean, false) or private.advisor_on_duty(x.schedule));
      if cands is null then continue; end if;
      -- En la regla general, la línea de respaldo solo atiende si no hay otros asesores
      if cardinality(r.advisor_ids) = 0 then
        select array_agg(x.id order by array_position(cands, x.id)) into filtered
          from public.advisors x where x.id = any (cands) and not x.is_fallback;
        if filtered is not null then cands := filtered; end if;
      end if;
      -- Preferir a quien atiende ese catálogo, país e idioma (si nadie, se usan todos)
      select array_agg(x.id order by array_position(cands, x.id)) into filtered
        from public.advisors x
       where x.id = any (cands)
         and (cat is null or cat = any (x.catalogs))
         and (lang is null or lang = any (x.languages))
         and (cardinality(x.countries) = 0 or country is null or country = any (x.countries));
      if filtered is not null then cands := filtered; end if;
      n := cardinality(cands);

      if r.strategy = 'fijo' then
        adv := cands[1];
      elsif r.strategy = 'ponderada' then
        select sum(x.weight) into total from public.advisors x where x.id = any (cands);
        insert into public.routing_state (rule_id, last_index) values (r.id, 0)
        on conflict (rule_id) do update set last_index = (public.routing_state.last_index + 1) % greatest(total, 1)
        returning last_index into idx;
        acc := 0;
        for a in select x.id, x.weight from public.advisors x where x.id = any (cands) order by array_position(cands, x.id) loop
          acc := acc + a.weight;
          if idx < acc then adv := a.id; exit; end if;
        end loop;
      else -- rotacion (y «elección» mientras no haya tarjetas de asesores)
        insert into public.routing_state (rule_id, last_index) values (r.id, 0)
        on conflict (rule_id) do update set last_index = (public.routing_state.last_index + 1) % 1000000
        returning last_index into idx;
        adv := cands[(idx % n) + 1];
      end if;
      rule_used := r.id;
      exit when adv is not null;
    end loop;
  end if;

  -- 3) Respaldo
  if adv is null then
    select x.id into adv from public.advisors x where x.active order by x.is_fallback desc, x.sort limit 1;
  end if;

  insert into public.leads (product_id, catalog, part_key, advisor_id, rule_id, country, locale, utm, visitor_id,
                            customer_id, source, device, user_agent, ip_hash)
  values (p_product, cat, left(p_part_key, 40), adv, rule_used, country, lang,
          coalesce(p_utm, '{}'::jsonb) - array(select k from jsonb_object_keys(coalesce(p_utm, '{}'::jsonb)) k
                                                where k not in ('utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'ref')),
          visitor, uid, src, left(p_device, 20), left(p_user_agent, 300), ip)
  returning id, code into lid, lcode;

  select x.name, x.phone_e164 into a from public.advisors x where x.id = adv;
  return jsonb_build_object('lead_id', lid, 'code', lcode, 'advisor_id', adv, 'name', a.name, 'phone', a.phone_e164);
end $$;

revoke execute on function public.lead_create(uuid, text, text, text, text, text, jsonb, text, text, text, text) from public;
grant execute on function public.lead_create(uuid, text, text, text, text, text, jsonb, text, text, text, text) to anon, authenticated;

-- Medición: IDs de Google Analytics 4 y del Píxel de Meta (se editan en /admin/empresa).
-- Solo se cargan en el sitio si el visitante acepta las cookies de medición.
alter table public.company_settings
  add column if not exists analytics jsonb not null default '{}';
alter table public.company_settings drop constraint if exists company_analytics_ids;
alter table public.company_settings add constraint company_analytics_ids check (
  (analytics ->> 'ga4' is null or analytics ->> 'ga4' ~ '^G-[A-Z0-9]{4,15}$')
  and (analytics ->> 'pixel' is null or analytics ->> 'pixel' ~ '^[0-9]{6,20}$')
);
