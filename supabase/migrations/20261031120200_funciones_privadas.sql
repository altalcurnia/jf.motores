-- Las funciones auxiliares de permisos no deben poder llamarse por la API (/rest/v1/rpc).
-- Se mueven al esquema "private" (no expuesto). Las políticas y triggers las siguen
-- referenciando porque Postgres las enlaza por identificador interno.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.has_permission(text) set schema private;
alter function public.current_role_key() set schema private;
alter function public.product_is_public(uuid) set schema private;
alter function public.handle_new_user() set schema private;
alter function public.guard_profile_role() set schema private;

-- El cuerpo de este trigger llama a has_permission por nombre: actualizarlo.
create or replace function private.guard_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role_id is distinct from old.role_id
     and (select auth.uid()) is not null
     and not (select private.has_permission('usuarios.gestionar')) then
    raise exception 'No tienes permiso para cambiar roles';
  end if;
  return new;
end $$;

-- Funciones de trigger: nadie las llama directamente.
revoke execute on function private.handle_new_user() from public, anon, authenticated;
revoke execute on function private.guard_profile_role() from public, anon, authenticated;

-- Funciones usadas por las políticas RLS: las necesitan anon y authenticated.
grant execute on function private.has_permission(text) to anon, authenticated;
grant execute on function private.current_role_key() to anon, authenticated;
grant execute on function private.product_is_public(uuid) to anon, authenticated;

-- admin_bootstrap: sin acceso por la API a propósito (solo SQL/servidor).
comment on table public.admin_bootstrap is 'Correos con rol Administrador al registrarse. Sin políticas RLS a propósito: no accesible por la API.';
