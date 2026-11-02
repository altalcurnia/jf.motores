-- Avisos de cotizaciones sin atender.
-- Cada 15 minutos la base de datos (pg_cron) busca leads que siguen en "Nuevo":
--   · 2 h después, y con el asesor en su horario → correo al asesor (o al correo de la empresa).
--   · 24 h después → correo al propietario.
-- Envía la lista a /api/cron/leads con una clave que solo existe aquí (el sitio guarda su huella sha256).

create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table public.leads
  add column if not exists reminded_at timestamptz,
  add column if not exists escalated_at timestamptz;
create index if not exists leads_pending_idx on public.leads (created_at) where status = 'nuevo';

-- Configuración interna (no expuesta por la API)
create table if not exists private.app_config (
  key text primary key,
  value text not null
);
insert into private.app_config (key, value) values
  ('cron_secret', encode(extensions.gen_random_bytes(32), 'hex')),
  ('site_url', 'https://jfmotores.altalcurnia.com')
on conflict (key) do nothing;
revoke all on private.app_config from public, anon, authenticated;

create or replace function private.lead_reminders_dispatch()
returns int language plpgsql security definer set search_path = '' as $$
declare
  site text := (select value from private.app_config where key = 'site_url');
  secret text := (select value from private.app_config where key = 'cron_secret');
  company_email text := (select nullif(trim(email), '') from public.company_settings limit 1);
  owner_emails text[] := array(
    select u.email::text from public.profiles p join auth.users u on u.id = p.id
     where p.is_owner and u.email is not null);
  items jsonb := '[]';
  r record;
  n int := 0;
begin
  if site is null or secret is null then return 0; end if;

  -- 1) Al asesor: 2 h en "Nuevo" y el asesor en turno (sin horario = siempre)
  for r in
    select l.id, l.code, l.created_at, l.source, l.catalog, l.product_id,
           a.name as advisor, a.is_fallback, a.schedule,
           (select u.email::text from auth.users u where u.id = a.profile_id) as advisor_email,
           coalesce(pr.name ->> 'es', pr.ref) as product
      from public.leads l
      join public.advisors a on a.id = l.advisor_id
      left join public.products pr on pr.id = l.product_id
     where l.status = 'nuevo' and l.reminded_at is null
       and l.created_at < now() - interval '2 hours'
       and l.created_at > now() - interval '7 days'
       and private.advisor_on_duty(a.schedule)
     order by l.created_at
     limit 200
     for update of l skip locked
  loop
    update public.leads set reminded_at = now() where id = r.id;
    if coalesce(r.advisor_email, company_email) is not null then
      items := items || jsonb_build_object(
        'kind', 'asesor', 'to', coalesce(r.advisor_email, company_email), 'advisor', r.advisor,
        'lead', r.id, 'code', r.code, 'product', r.product, 'catalog', r.catalog, 'source', r.source,
        'created_at', r.created_at);
      n := n + 1;
    end if;
  end loop;

  -- 2) Al propietario: 24 h sin atender
  for r in
    select l.id, l.code, l.created_at, l.source, l.catalog, a.name as advisor,
           coalesce(pr.name ->> 'es', pr.ref) as product
      from public.leads l
      left join public.advisors a on a.id = l.advisor_id
      left join public.products pr on pr.id = l.product_id
     where l.status = 'nuevo' and l.escalated_at is null
       and l.created_at < now() - interval '24 hours'
       and l.created_at > now() - interval '7 days'
     order by l.created_at
     limit 200
     for update of l skip locked
  loop
    update public.leads set escalated_at = now() where id = r.id;
    for i in 1 .. greatest(coalesce(array_length(owner_emails, 1), 0), 1) loop
      if coalesce(owner_emails[i], company_email) is not null then
        items := items || jsonb_build_object(
          'kind', 'propietario', 'to', coalesce(owner_emails[i], company_email), 'advisor', r.advisor,
          'lead', r.id, 'code', r.code, 'product', r.product, 'catalog', r.catalog, 'source', r.source,
          'created_at', r.created_at);
        n := n + 1;
      end if;
    end loop;
  end loop;

  if n > 0 then
    perform net.http_post(
      url := site || '/api/cron/leads',
      body := jsonb_build_object('items', items),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret),
      timeout_milliseconds := 10000
    );
  end if;
  return n;
end $$;
revoke execute on function private.lead_reminders_dispatch() from public, anon, authenticated;

-- Cada 15 minutos
select cron.unschedule('jf-avisos-leads') where exists (select 1 from cron.job where jobname = 'jf-avisos-leads');
select cron.schedule('jf-avisos-leads', '*/15 * * * *', 'select private.lead_reminders_dispatch()');
