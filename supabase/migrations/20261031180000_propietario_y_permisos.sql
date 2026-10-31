-- Solo el PROPIETARIO (cuenta en admin_bootstrap) otorga roles y edita permisos.
-- Toda cuenta nueva es Cliente. Nadie puede volverse propietario desde la API.

alter table public.profiles add column is_owner boolean not null default false;
update public.profiles p set is_owner = true
where exists (select 1 from public.admin_bootstrap b where lower(b.email) = lower(p.email));

create or replace function private.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_owner from public.profiles where id = (select auth.uid())), false)
$$;
grant execute on function private.is_owner() to anon, authenticated;

-- Registro: el propietario sale de admin_bootstrap; los demás, Cliente.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner boolean := exists (select 1 from public.admin_bootstrap b where lower(b.email) = lower(new.email));
  rid smallint;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  select id into rid from public.roles where key = case when owner then 'admin' else 'cliente' end;
  insert into public.profiles (id, email, full_name, phone, country, role_id, is_owner, privacy_accepted_at, marketing_opt_in)
  values (
    new.id, new.email,
    nullif(left(trim(coalesce(meta ->> 'full_name', meta ->> 'name')), 120), ''),
    nullif(left(trim(meta ->> 'phone'), 30), ''),
    nullif(upper(left(trim(meta ->> 'country'), 2)), ''),
    rid, owner,
    case when (meta ->> 'privacy_accepted') = 'true' then now() end,
    coalesce((meta ->> 'marketing_opt_in') = 'true', false)
  );
  return new;
end $$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

-- Cambios de rol o de propietario: solo por SQL o por las funciones del propietario.
create or replace function private.guard_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;  -- SQL directo / servidor
  if new.is_owner is distinct from old.is_owner then
    raise exception 'El propietario solo se define desde la base de datos';
  end if;
  if new.role_id is distinct from old.role_id and current_setting('jf.role_change', true) is distinct from 'owner' then
    raise exception 'Solo el propietario puede cambiar roles';
  end if;
  return new;
end $$;
revoke execute on function private.guard_profile_role() from public, anon, authenticated;

-- Roles y permisos: escritura solo del propietario
drop policy if exists roles_write on public.roles;
drop policy if exists role_perms_write on public.role_permissions;
drop policy if exists profiles_admin_write on public.profiles;
create policy roles_write on public.roles for all to authenticated
  using ((select private.is_owner())) with check ((select private.is_owner()));
create policy role_perms_write on public.role_permissions for all to authenticated
  using ((select private.is_owner())) with check ((select private.is_owner()));

-- Cambiar el rol de un usuario (solo propietario, nunca a sí mismo ni a otro propietario)
create or replace function public.set_user_role(target uuid, role_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare rid smallint;
begin
  if not (select private.is_owner()) then raise exception 'Solo el propietario puede cambiar roles'; end if;
  if target = (select auth.uid()) then raise exception 'No puedes cambiar tu propio rol'; end if;
  if exists (select 1 from public.profiles where id = target and is_owner) then raise exception 'No se puede cambiar el rol del propietario'; end if;
  select id into rid from public.roles where key = role_key;
  if rid is null then raise exception 'Rol inexistente'; end if;
  perform set_config('jf.role_change', 'owner', true);
  update public.profiles set role_id = rid where id = target;
  insert into public.audit_log (actor, table_name, record_id, action, diff)
  values ((select auth.uid()), 'profiles', target::text, 'set_role', jsonb_build_object('role', role_key));
end $$;

-- Dar o quitar un permiso a un rol (solo propietario; Administrador y Cliente son fijos)
create or replace function public.set_role_permission(role_key text, permission_key text, granted boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare rid smallint;
begin
  if not (select private.is_owner()) then raise exception 'Solo el propietario puede editar permisos'; end if;
  if role_key in ('admin', 'cliente') then raise exception 'Los permisos de este rol son fijos'; end if;
  select id into rid from public.roles where key = role_key;
  if rid is null then raise exception 'Rol inexistente'; end if;
  if not exists (select 1 from public.permissions where key = permission_key) then raise exception 'Permiso inexistente'; end if;
  if granted then
    insert into public.role_permissions (role_id, permission_key) values (rid, permission_key) on conflict do nothing;
  else
    delete from public.role_permissions where role_id = rid and role_permissions.permission_key = set_role_permission.permission_key;
  end if;
  insert into public.audit_log (actor, table_name, record_id, action, diff)
  values ((select auth.uid()), 'role_permissions', role_key, case when granted then 'grant' else 'revoke' end,
          jsonb_build_object('permission', permission_key));
end $$;

revoke execute on function public.set_user_role(uuid, text) from public, anon;
revoke execute on function public.set_role_permission(text, text, boolean) from public, anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;
grant execute on function public.set_role_permission(text, text, boolean) to authenticated;

-- usuarios.gestionar ya no aplica (es exclusivo del propietario)
delete from public.permissions where key = 'usuarios.gestionar';
