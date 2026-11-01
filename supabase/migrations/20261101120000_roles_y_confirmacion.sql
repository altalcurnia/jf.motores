-- Roles personalizados y confirmación con contraseña del propietario.
-- Cambiar roles o permisos exige que el propietario haya confirmado su contraseña
-- en los últimos 10 minutos. La verificación se hace dentro de la base de datos,
-- así que no se puede saltar llamando a la API directamente.

-- -------------------------------------------------------------- Desbloqueo
create table if not exists private.owner_unlocks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  expires_at timestamptz not null
);
revoke all on private.owner_unlocks from public, anon, authenticated;

create or replace function private.owner_unlocked()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_owner())
     and exists (select 1 from private.owner_unlocks where user_id = (select auth.uid()) and expires_at > now());
$$;
revoke execute on function private.owner_unlocked() from public, anon, authenticated;

-- Verifica la contraseña del propietario y desbloquea 10 minutos.
-- Devuelve {ok, expires_at} o {ok:false, reason: 'not_owner'|'no_password'|'wrong'|'locked'}.
create or replace function public.owner_unlock(password text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  hash text;
  fails int;
  until timestamptz := now() + interval '10 minutes';
begin
  if uid is null or not (select private.is_owner()) then
    return jsonb_build_object('ok', false, 'reason', 'not_owner');
  end if;
  select count(*) into fails from public.audit_log
   where actor = uid and action = 'unlock_fail' and at > now() - interval '15 minutes';
  if fails >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;
  select encrypted_password into hash from auth.users where id = uid;
  if hash is null or hash = '' then
    return jsonb_build_object('ok', false, 'reason', 'no_password');
  end if;
  if password is null or extensions.crypt(password, hash) <> hash then
    insert into public.audit_log (actor, table_name, record_id, action) values (uid, 'owner', uid::text, 'unlock_fail');
    return jsonb_build_object('ok', false, 'reason', 'wrong', 'attempts_left', 4 - fails);
  end if;
  insert into private.owner_unlocks (user_id, expires_at) values (uid, until)
  on conflict (user_id) do update set expires_at = excluded.expires_at;
  insert into public.audit_log (actor, table_name, record_id, action) values (uid, 'owner', uid::text, 'unlock');
  return jsonb_build_object('ok', true, 'expires_at', until);
end $$;

create or replace function public.owner_lock()
returns void language sql security definer set search_path = '' as $$
  delete from private.owner_unlocks where user_id = (select auth.uid());
$$;

-- Hasta cuándo sigue desbloqueado (null si no lo está)
create or replace function public.owner_unlock_status()
returns timestamptz language sql stable security definer set search_path = '' as $$
  select expires_at from private.owner_unlocks
   where user_id = (select auth.uid()) and expires_at > now() and (select private.is_owner());
$$;

-- -------------------------------------------------------------- Comprobación común
create or replace function private.require_owner_unlocked()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.is_owner()) then raise exception 'Solo el propietario puede hacer este cambio'; end if;
  if not (select private.owner_unlocked()) then
    raise exception 'Confirma tu contraseña para hacer cambios (se pide cada 10 minutos)' using errcode = 'P0001', hint = 'unlock_required';
  end if;
end $$;
revoke execute on function private.require_owner_unlocked() from public, anon, authenticated;

-- Las tablas de roles y permisos ya no se escriben directamente: solo por estas funciones.
drop policy if exists roles_write on public.roles;
drop policy if exists role_perms_write on public.role_permissions;

-- -------------------------------------------------------------- Asignar rol a un usuario
create or replace function public.set_user_role(target uuid, role_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare rid smallint;
begin
  perform private.require_owner_unlocked();
  if target = (select auth.uid()) then raise exception 'No puedes cambiar tu propio rol'; end if;
  if exists (select 1 from public.profiles where id = target and is_owner) then raise exception 'No se puede cambiar el rol del propietario'; end if;
  select id into rid from public.roles where key = role_key;
  if rid is null then raise exception 'Rol inexistente'; end if;
  perform set_config('jf.role_change', 'owner', true);
  update public.profiles set role_id = rid where id = target;
  insert into public.audit_log (actor, table_name, record_id, action, diff)
  values ((select auth.uid()), 'profiles', target::text, 'set_role', jsonb_build_object('role', role_key));
end $$;

-- -------------------------------------------------------------- Permisos
create or replace function public.set_role_permission(role_key text, permission_key text, granted boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare rid smallint;
begin
  perform private.require_owner_unlocked();
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

-- Activar o quitar todos los permisos de un rol
create or replace function public.set_role_all_permissions(role_key text, granted boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare rid smallint;
begin
  perform private.require_owner_unlocked();
  if role_key in ('admin', 'cliente') then raise exception 'Los permisos de este rol son fijos'; end if;
  select id into rid from public.roles where key = role_key;
  if rid is null then raise exception 'Rol inexistente'; end if;
  if granted then
    insert into public.role_permissions (role_id, permission_key)
    select rid, p.key from public.permissions p on conflict do nothing;
  else
    delete from public.role_permissions where role_id = rid;
  end if;
  insert into public.audit_log (actor, table_name, record_id, action, diff)
  values ((select auth.uid()), 'role_permissions', role_key, case when granted then 'grant_all' else 'revoke_all' end, null);
end $$;

-- -------------------------------------------------------------- Crear, editar y borrar roles
create or replace function public.create_role(role_name text, role_description text default null,
                                              internal boolean default true, copy_from text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  base text;
  k text;
  n int := 1;
  rid smallint;
begin
  perform private.require_owner_unlocked();
  role_name := left(trim(coalesce(role_name, '')), 60);
  if length(role_name) < 2 then raise exception 'Escribe el nombre del rol'; end if;
  if exists (select 1 from public.roles where lower(name) = lower(role_name)) then raise exception 'Ya existe un rol con ese nombre'; end if;
  base := trim(both '_' from regexp_replace(translate(lower(role_name), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z0-9]+', '_', 'g'));
  if base = '' then base := 'rol'; end if;
  k := base;
  while exists (select 1 from public.roles where key = k) loop
    n := n + 1;
    k := base || '_' || n;
  end loop;
  insert into public.roles (key, name, is_internal, description)
  values (k, role_name, internal, nullif(left(trim(coalesce(role_description, '')), 200), ''))
  returning id into rid;
  if copy_from is not null and internal then
    insert into public.role_permissions (role_id, permission_key)
    select rid, rp.permission_key from public.role_permissions rp join public.roles r on r.id = rp.role_id where r.key = copy_from;
  end if;
  insert into public.audit_log (actor, table_name, record_id, action, diff)
  values ((select auth.uid()), 'roles', k, 'create', jsonb_build_object('name', role_name, 'internal', internal, 'copy_from', copy_from));
  return k;
end $$;

create or replace function public.update_role(role_key text, role_name text, role_description text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_owner_unlocked();
  if role_key in ('admin', 'cliente') then raise exception 'Este rol es fijo'; end if;
  role_name := left(trim(coalesce(role_name, '')), 60);
  if length(role_name) < 2 then raise exception 'Escribe el nombre del rol'; end if;
  if exists (select 1 from public.roles where lower(name) = lower(role_name) and key <> role_key) then
    raise exception 'Ya existe un rol con ese nombre';
  end if;
  update public.roles set name = role_name, description = nullif(left(trim(coalesce(role_description, '')), 200), '')
   where key = role_key;
  if not found then raise exception 'Rol inexistente'; end if;
  insert into public.audit_log (actor, table_name, record_id, action, diff)
  values ((select auth.uid()), 'roles', role_key, 'update', jsonb_build_object('name', role_name));
end $$;

create or replace function public.delete_role(role_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  rid smallint;
  users int;
begin
  perform private.require_owner_unlocked();
  if role_key in ('admin', 'cliente') then raise exception 'Este rol es fijo'; end if;
  select id into rid from public.roles where key = role_key;
  if rid is null then raise exception 'Rol inexistente'; end if;
  select count(*) into users from public.profiles where role_id = rid;
  if users > 0 then
    raise exception 'Este rol tiene % usuario(s). Cámbiales el rol antes de borrarlo.', users;
  end if;
  delete from public.roles where id = rid;
  insert into public.audit_log (actor, table_name, record_id, action) values ((select auth.uid()), 'roles', role_key, 'delete');
end $$;

-- -------------------------------------------------------------- Permisos de ejecución
do $$
declare f text;
begin
  foreach f in array array[
    'public.owner_unlock(text)', 'public.owner_lock()', 'public.owner_unlock_status()',
    'public.set_user_role(uuid, text)', 'public.set_role_permission(text, text, boolean)',
    'public.set_role_all_permissions(text, boolean)', 'public.create_role(text, text, boolean, text)',
    'public.update_role(text, text, text)', 'public.delete_role(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
