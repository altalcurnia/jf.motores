-- Cupos del asistente con dos candados independientes, que solo abre el propietario con su contraseña:
--   · ia_personal: cupo mensual de cada rol interno (Administrador, Editor, Asesor…).
--   · ia_clientes: fórmula de clientes (base + valor por millón comprado, con tope).
-- La base de datos hace cumplir los candados, así que no se pueden saltar llamando a la API.

-- -------------------------------------------------------------- Candados por sección
create table if not exists private.owner_scope_unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  scope text not null check (scope in ('ia_personal', 'ia_clientes')),
  expires_at timestamptz not null,
  primary key (user_id, scope)
);
revoke all on private.owner_scope_unlocks from public, anon, authenticated;

create or replace function private.owner_scope_unlocked(scope text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_owner())
     and exists (select 1 from private.owner_scope_unlocks u
                  where u.user_id = (select auth.uid()) and u.scope = owner_scope_unlocked.scope and u.expires_at > now());
$$;
revoke execute on function private.owner_scope_unlocked(text) from public, anon, authenticated;

create or replace function private.require_owner_scope(scope text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.is_owner()) then raise exception 'Solo el propietario puede cambiar los cupos'; end if;
  if not (select private.owner_scope_unlocked(scope)) then
    raise exception 'Este bloque está bloqueado: confirma tu contraseña para cambiarlo' using errcode = 'P0001', hint = 'unlock_required';
  end if;
end $$;
revoke execute on function private.require_owner_scope(text) from public, anon, authenticated;

-- Misma verificación que owner_unlock (contraseña del propietario y 5 intentos cada 15 min), pero solo abre un candado.
create or replace function public.owner_unlock_scope(password text, scope text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  hash text;
  fails int;
  until timestamptz := now() + interval '10 minutes';
begin
  if scope not in ('ia_personal', 'ia_clientes') then return jsonb_build_object('ok', false, 'reason', 'scope'); end if;
  if uid is null or not (select private.is_owner()) then
    return jsonb_build_object('ok', false, 'reason', 'not_owner');
  end if;
  select count(*) into fails from public.audit_log
   where actor = uid and action = 'unlock_fail' and at > now() - interval '15 minutes';
  if fails >= 5 then return jsonb_build_object('ok', false, 'reason', 'locked'); end if;
  select encrypted_password into hash from auth.users where id = uid;
  if hash is null or hash = '' then return jsonb_build_object('ok', false, 'reason', 'no_password'); end if;
  if password is null or extensions.crypt(password, hash) <> hash then
    insert into public.audit_log (actor, table_name, record_id, action) values (uid, 'owner', scope, 'unlock_fail');
    return jsonb_build_object('ok', false, 'reason', 'wrong', 'attempts_left', 4 - fails);
  end if;
  insert into private.owner_scope_unlocks (user_id, scope, expires_at) values (uid, scope, until)
  on conflict on constraint owner_scope_unlocks_pkey do update set expires_at = excluded.expires_at;
  insert into public.audit_log (actor, table_name, record_id, action) values (uid, 'owner', scope, 'unlock');
  return jsonb_build_object('ok', true, 'expires_at', until);
end $$;

create or replace function public.owner_lock_scope(scope text)
returns void language sql security definer set search_path = '' as $$
  delete from private.owner_scope_unlocks u where u.user_id = (select auth.uid()) and u.scope = owner_lock_scope.scope;
$$;

-- {ia_personal: hasta, ia_clientes: hasta} solo para el propietario
create or replace function public.owner_scope_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(u.scope, u.expires_at), '{}'::jsonb)
    from private.owner_scope_unlocks u
   where u.user_id = (select auth.uid()) and u.expires_at > now() and (select private.is_owner());
$$;

-- -------------------------------------------------------------- Cupo del personal (por rol interno)
alter table public.roles
  add column if not exists ai_budget_usd numeric(6, 3) check (ai_budget_usd between 0 and 50);
update public.roles set ai_budget_usd = 2.00 where is_internal and ai_budget_usd is null;

create or replace function public.set_role_ai_budget(role_key text, usd numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_owner_scope('ia_personal');
  if usd is null or usd < 0 or usd > 50 then raise exception 'El cupo debe estar entre 0 y 50 dólares'; end if;
  update public.roles set ai_budget_usd = round(usd, 3) where key = role_key and is_internal;
  if not found then raise exception 'Rol interno no encontrado'; end if;
  insert into public.audit_log (actor, table_name, record_id, action) values ((select auth.uid()), 'roles', role_key, 'ai_budget');
end $$;

-- -------------------------------------------------------------- Cupo de clientes: solo con su candado
create or replace function private.guard_ai_customer_budget()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.budget_base_usd, new.budget_per_million_cop_usd, new.budget_max_usd)
     is distinct from (old.budget_base_usd, old.budget_per_million_cop_usd, old.budget_max_usd) then
    perform private.require_owner_scope('ia_clientes');
    insert into public.audit_log (actor, table_name, record_id, action) values ((select auth.uid()), 'ai_settings', 'cupos_clientes', 'ai_budget');
  end if;
  return new;
end $$;
revoke execute on function private.guard_ai_customer_budget() from public, anon, authenticated;
drop trigger if exists ai_settings_customer_budget on public.ai_settings;
create trigger ai_settings_customer_budget before update on public.ai_settings
  for each row execute function private.guard_ai_customer_budget();

-- -------------------------------------------------------------- Cupo del mes del usuario actual
create or replace function public.ai_budget()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  s public.ai_settings;
  spent numeric := 0;
  bought numeric := 0;
  internal boolean := false;
  role_usd numeric;
  lim numeric;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  select * into s from public.ai_settings where id;
  select r.is_internal, r.ai_budget_usd into internal, role_usd
    from public.profiles p join public.roles r on r.id = p.role_id where p.id = uid;
  select coalesce(cost_usd, 0) into spent from public.ai_usage
   where user_id = uid and month = date_trunc('month', now() at time zone 'America/Bogota')::date;
  if coalesce(internal, false) then
    lim := coalesce(role_usd, s.budget_max_usd);
  else
    select coalesce(sum(coalesce(u.price_cop, p.price_cop, 0)), 0) into bought
      from public.units u join public.products p on p.id = u.product_id where u.owner_id = uid;
    lim := least(s.budget_max_usd, s.budget_base_usd + (bought / 1000000.0) * s.budget_per_million_cop_usd);
  end if;
  return jsonb_build_object('ok', true, 'limit_usd', round(lim, 4), 'used_usd', round(coalesce(spent, 0), 6),
                            'purchases_cop', bought, 'staff', coalesce(internal, false));
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.owner_unlock_scope(text, text)', 'public.owner_lock_scope(text)',
                           'public.owner_scope_status()', 'public.set_role_ai_budget(text, numeric)'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
