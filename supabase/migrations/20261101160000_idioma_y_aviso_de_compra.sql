-- Idioma preferido del cliente (para escribirle en su idioma) y registro del correo de compra.

alter table public.profiles
  add column if not exists locale text not null default 'es' check (locale in ('es', 'en', 'pt'));
grant update (locale) on public.profiles to authenticated;

update public.profiles p
   set locale = u.raw_user_meta_data ->> 'locale'
  from auth.users u
 where u.id = p.id and (u.raw_user_meta_data ->> 'locale') in ('es', 'en', 'pt');

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner boolean := exists (select 1 from public.admin_bootstrap b where lower(b.email) = lower(new.email));
  rid smallint;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  lang text := meta ->> 'locale';
begin
  select id into rid from public.roles where key = case when owner then 'admin' else 'cliente' end;
  insert into public.profiles (id, email, full_name, phone, country, role_id, is_owner, privacy_accepted_at, marketing_opt_in, locale)
  values (
    new.id, new.email,
    nullif(left(trim(coalesce(meta ->> 'full_name', meta ->> 'name')), 120), ''),
    nullif(left(trim(meta ->> 'phone'), 30), ''),
    nullif(upper(left(trim(meta ->> 'country'), 2)), ''),
    rid, owner,
    case when (meta ->> 'privacy_accepted') = 'true' then now() end,
    coalesce((meta ->> 'marketing_opt_in') = 'true', false),
    case when lang in ('es', 'en', 'pt') then lang else 'es' end
  );
  return new;
end $$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

-- Cuándo se le avisó al cliente por correo de esta compra
alter table public.units add column if not exists notified_at timestamptz;
