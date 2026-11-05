-- Asistente: solo con cuenta y con un cupo mensual en dólares por cliente.
-- Cupo = base + (compras en COP / 1 000 000) × valor por millón, con un tope (por defecto 0,10 + 0,08/M, máx. 2 USD).

alter table public.ai_settings
  add column if not exists budget_base_usd numeric(6, 3) not null default 0.10 check (budget_base_usd between 0 and 10),
  add column if not exists budget_per_million_cop_usd numeric(6, 3) not null default 0.08 check (budget_per_million_cop_usd between 0 and 10),
  add column if not exists budget_max_usd numeric(6, 3) not null default 2.00 check (budget_max_usd between 0 and 50);

create table if not exists public.ai_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  month date not null,
  cost_usd numeric(12, 6) not null default 0,
  requests int not null default 0,
  tokens_in bigint not null default 0,
  tokens_out bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
alter table public.ai_usage enable row level security;
create policy ai_usage_read on public.ai_usage for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('asistente.gestionar')));
-- Sin políticas de escritura: solo se modifica con ai_charge().

-- Cupo del mes del usuario actual
create or replace function public.ai_budget()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  s public.ai_settings;
  spent numeric := 0;
  bought numeric := 0;
  lim numeric;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  select * into s from public.ai_settings where id;
  select coalesce(sum(coalesce(u.price_cop, p.price_cop, 0)), 0) into bought
    from public.units u join public.products p on p.id = u.product_id where u.owner_id = uid;
  select coalesce(cost_usd, 0) into spent from public.ai_usage
   where user_id = uid and month = date_trunc('month', now() at time zone 'America/Bogota')::date;
  lim := least(s.budget_max_usd, s.budget_base_usd + (bought / 1000000.0) * s.budget_per_million_cop_usd);
  return jsonb_build_object('ok', true, 'limit_usd', round(lim, 4), 'used_usd', round(coalesce(spent, 0), 6), 'purchases_cop', bought);
end $$;

-- Suma el costo de una respuesta al cupo del usuario actual (solo suma; tope por llamada)
create or replace function public.ai_charge(cost numeric, tokens_in int, tokens_out int)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'Inicia sesión'; end if;
  if cost is null or cost < 0 or cost > 1 then raise exception 'Costo inválido'; end if;
  insert into public.ai_usage (user_id, month, cost_usd, requests, tokens_in, tokens_out)
  values (uid, date_trunc('month', now() at time zone 'America/Bogota')::date, cost, 1, greatest(tokens_in, 0), greatest(tokens_out, 0))
  on conflict (user_id, month) do update
    set cost_usd = public.ai_usage.cost_usd + excluded.cost_usd,
        requests = public.ai_usage.requests + 1,
        tokens_in = public.ai_usage.tokens_in + excluded.tokens_in,
        tokens_out = public.ai_usage.tokens_out + excluded.tokens_out,
        updated_at = now();
end $$;

revoke execute on function public.ai_budget() from public, anon;
revoke execute on function public.ai_charge(numeric, int, int) from public, anon;
grant execute on function public.ai_budget() to authenticated;
grant execute on function public.ai_charge(numeric, int, int) to authenticated;
