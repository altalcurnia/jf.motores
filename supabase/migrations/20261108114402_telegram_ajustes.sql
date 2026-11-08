-- Bot de Telegram: ajustes editables en el panel (Admin → Asistente) y tope de gasto mensual de IA.
-- Aprobada por el dueño el 8-nov-2026 (tope inicial: US$2 al mes).
-- El token del bot y el secreto del webhook siguen en Vercel (TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET).
-- El servidor lee estas tablas con la clave secreta (SUPABASE_SECRET_KEY); el público no puede verlas.

-- -------------------------------------------------------------- Ajustes (fila única)
create table if not exists public.telegram_settings (
  id boolean primary key default true check (id),
  -- Abierto a cualquier cliente como asistente de ventas y técnico (si no, solo los chats de prueba)
  public_enabled boolean not null default false,
  -- Chats que pueden probar el bot aunque no esté abierto al público
  test_chats bigint[] not null default '{}' check (cardinality(test_chats) <= 50),
  -- Chats del equipo que reciben un aviso por cada cliente nuevo (clic a WhatsApp)
  team_chats bigint[] not null default '{}' check (cardinality(team_chats) <= 20),
  notify_leads boolean not null default true,
  -- Tope de gasto de IA del bot por mes; al llegar, el bot manda al cliente a WhatsApp
  monthly_cap_usd numeric(8, 2) not null default 2 check (monthly_cap_usd between 0 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.telegram_settings (id) values (true) on conflict (id) do nothing;
create index if not exists telegram_settings_updated_by_idx on public.telegram_settings (updated_by);
alter table public.telegram_settings enable row level security;
create policy telegram_settings_read on public.telegram_settings for select to authenticated
  using ((select private.has_permission('asistente.gestionar')));
create policy telegram_settings_write on public.telegram_settings for update to authenticated
  using ((select private.has_permission('asistente.gestionar')))
  with check ((select private.has_permission('asistente.gestionar')));

-- -------------------------------------------------------------- Consumo del mes (no guarda conversaciones)
create table if not exists public.telegram_usage (
  month date primary key check (extract(day from month) = 1),
  cost_usd numeric(12, 6) not null default 0 check (cost_usd >= 0),
  messages integer not null default 0 check (messages >= 0),
  updated_at timestamptz not null default now()
);
alter table public.telegram_usage enable row level security;
create policy telegram_usage_read on public.telegram_usage for select to authenticated
  using ((select private.has_permission('asistente.gestionar')));

-- Suma el costo de una respuesta del bot al mes en curso (hora de Colombia). Solo el servidor.
create or replace function public.telegram_charge(p_cost numeric)
returns numeric language sql volatile security definer set search_path = '' as $$
  insert into public.telegram_usage as u (month, cost_usd, messages)
  values (date_trunc('month', now() at time zone 'America/Bogota')::date, greatest(0, least(coalesce(p_cost, 0), 1)), 1)
  on conflict (month) do update
    set cost_usd = u.cost_usd + excluded.cost_usd, messages = u.messages + 1, updated_at = now()
  returning cost_usd;
$$;
revoke execute on function public.telegram_charge(numeric) from public, anon, authenticated;
grant execute on function public.telegram_charge(numeric) to service_role;
