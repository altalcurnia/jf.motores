-- Quien entra con Google no pasa por la casilla del formulario de registro:
-- el consentimiento se registra al continuar (texto legal junto al botón) o desde Mi cuenta.
create or replace function public.accept_privacy()
returns void language sql security definer set search_path = '' as $$
  update public.profiles
  set privacy_accepted_at = now()
  where id = (select auth.uid()) and privacy_accepted_at is null;
$$;
revoke execute on function public.accept_privacy() from public, anon;
grant execute on function public.accept_privacy() to authenticated;
comment on function public.accept_privacy() is 'Registra la autorización de tratamiento de datos (Ley 1581) del usuario actual. Solo afecta su propio perfil.';
