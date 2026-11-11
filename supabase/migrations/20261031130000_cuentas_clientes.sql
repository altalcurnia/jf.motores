-- Cuentas de clientes: consentimiento de datos (Ley 1581/2012) y datos del registro.
alter table public.profiles
  add column privacy_accepted_at timestamptz,
  add column marketing_opt_in boolean not null default false;

-- El perfil toma nombre, teléfono, país y consentimiento enviados al registrarse.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rid smallint;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  select id into rid from public.roles
  where key = case
    when exists (select 1 from public.admin_bootstrap b where lower(b.email) = lower(new.email)) then 'admin'
    else 'cliente'
  end;
  insert into public.profiles (id, email, full_name, phone, country, role_id, privacy_accepted_at, marketing_opt_in)
  values (
    new.id,
    new.email,
    nullif(left(trim(meta ->> 'full_name'), 120), ''),
    nullif(left(trim(meta ->> 'phone'), 30), ''),
    nullif(upper(left(trim(meta ->> 'country'), 2)), ''),
    rid,
    case when (meta ->> 'privacy_accepted') = 'true' then now() end,
    coalesce((meta ->> 'marketing_opt_in') = 'true', false)
  );
  return new;
end $$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

-- Cada usuario solo puede cambiar estas columnas de su propio perfil
-- (el correo y el rol no se editan desde el navegador).
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone, country, marketing_opt_in) on public.profiles to authenticated;
