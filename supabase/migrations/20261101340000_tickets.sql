-- Tickets de soporte: el cliente (con cuenta) abre un ticket desde el botón Soporte y conversa
-- con el equipo; responde quien tenga el permiso tickets.responder. Admite fotos (bucket privado).
-- Las tablas solo se leen con RLS; todas las escrituras pasan por funciones que validan.

insert into public.permissions (key, description)
values ('tickets.responder', 'Ver y responder los tickets de soporte de los clientes')
on conflict (key) do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, 'tickets.responder' from public.roles r where r.key = 'admin'
on conflict do nothing;

-- -------------------------------------------------------------- Tablas
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (char_length(subject) between 3 and 120),
  status text not null default 'abierto' check (status in ('abierto', 'respondido', 'cerrado')),
  -- Avisos: hay algo nuevo para el equipo / para el cliente
  staff_unread boolean not null default true,
  user_unread boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tickets_user_idx on public.tickets (user_id, updated_at desc);
create index if not exists tickets_status_idx on public.tickets (status, updated_at desc);
alter table public.tickets enable row level security;
create policy tickets_read on public.tickets for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('tickets.responder')));

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  from_staff boolean not null default false,
  body text not null default '' check (char_length(body) <= 4000),
  images text[] not null default '{}' check (cardinality(images) <= 6),
  created_at timestamptz not null default now()
);
create index if not exists ticket_messages_ticket_idx on public.ticket_messages (ticket_id, created_at);
alter table public.ticket_messages enable row level security;
create policy ticket_messages_read on public.ticket_messages for select to authenticated
  using (exists (
    select 1 from public.tickets t
     where t.id = ticket_id
       and (t.user_id = (select auth.uid()) or (select private.has_permission('tickets.responder')))
  ));

-- Quien responde tickets ve nombre y correo de los clientes que abrieron alguno
drop policy if exists profiles_read_ticket_users on public.profiles;
create policy profiles_read_ticket_users on public.profiles for select to authenticated
  using ((select private.has_permission('tickets.responder'))
         and exists (select 1 from public.tickets t where t.user_id = profiles.id));

-- -------------------------------------------------------------- Fotos (bucket privado)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tickets', 'tickets', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Cada quien sube solo a su carpeta (<su id>/archivo)
drop policy if exists tickets_files_insert on storage.objects;
create policy tickets_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'tickets' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Lee: sus propias fotos, el equipo todas, y el cliente las que el equipo puso en sus tickets
drop policy if exists tickets_files_read on storage.objects;
create policy tickets_files_read on storage.objects for select to authenticated
  using (
    bucket_id = 'tickets' and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.has_permission('tickets.responder'))
      or exists (
        select 1 from public.ticket_messages m join public.tickets t on t.id = m.ticket_id
         where t.user_id = (select auth.uid()) and name = any (m.images)
      )
    )
  );

-- -------------------------------------------------------------- Funciones
-- Las fotos de un mensaje deben estar en la carpeta de quien lo escribe
create or replace function private.ticket_images_ok(uid uuid, images text[])
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(bool_and(i ~ ('^' || uid::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')), true)
    from unnest(coalesce(images, '{}')) as i;
$$;

-- Abre un ticket con su primer mensaje. Devuelve el id.
create or replace function public.ticket_create(subject text, body text, images text[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  tid uuid;
  subj text := btrim(coalesce(subject, ''));
  msg text := btrim(coalesce(body, ''));
begin
  if uid is null then raise exception 'Inicia sesión para abrir un ticket'; end if;
  if char_length(subj) < 3 then raise exception 'Escribe un asunto'; end if;
  if msg = '' and coalesce(cardinality(images), 0) = 0 then raise exception 'Escribe un mensaje o adjunta una foto'; end if;
  if not private.ticket_images_ok(uid, images) then raise exception 'Fotos inválidas'; end if;
  if (select count(*) from public.tickets where user_id = uid and status <> 'cerrado') >= 5 then
    raise exception 'Tienes 5 tickets abiertos. Cierra alguno o continúa en uno de ellos.';
  end if;
  if (select count(*) from public.tickets where user_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Alcanzaste el límite de tickets por hoy. Escríbenos por WhatsApp.';
  end if;
  insert into public.tickets (user_id, subject) values (uid, left(subj, 120)) returning id into tid;
  insert into public.ticket_messages (ticket_id, author_id, from_staff, body, images)
  values (tid, uid, false, left(msg, 4000), coalesce(images, '{}'));
  return tid;
end $$;

-- Agrega un mensaje (cliente o equipo) y actualiza estado y avisos.
create or replace function public.ticket_post(ticket uuid, body text, images text[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  t public.tickets;
  staff boolean;
  mid uuid;
  msg text := btrim(coalesce(body, ''));
begin
  if uid is null then raise exception 'Inicia sesión'; end if;
  select * into t from public.tickets where id = ticket;
  if not found then raise exception 'Ticket no encontrado'; end if;
  staff := t.user_id <> uid and (select private.has_permission('tickets.responder'));
  if t.user_id <> uid and not staff then raise exception 'Ticket no encontrado'; end if;
  if msg = '' and coalesce(cardinality(images), 0) = 0 then raise exception 'Escribe un mensaje o adjunta una foto'; end if;
  if not private.ticket_images_ok(uid, images) then raise exception 'Fotos inválidas'; end if;
  if (select count(*) from public.ticket_messages m
       where m.author_id = uid and m.created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Demasiados mensajes seguidos. Espera un momento.';
  end if;
  insert into public.ticket_messages (ticket_id, author_id, from_staff, body, images)
  values (ticket, uid, staff, left(msg, 4000), coalesce(images, '{}')) returning id into mid;
  if staff then
    update public.tickets set status = 'respondido', user_unread = true, staff_unread = false, updated_at = now() where id = ticket;
  else
    update public.tickets set status = 'abierto', staff_unread = true, user_unread = false, updated_at = now() where id = ticket;
  end if;
  return mid;
end $$;

-- Cerrar o reabrir: el cliente sus propios tickets; el equipo cualquiera.
create or replace function public.ticket_set_status(ticket uuid, new_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); tuser uuid;
begin
  if new_status not in ('abierto', 'respondido', 'cerrado') then raise exception 'Estado inválido'; end if;
  select user_id into tuser from public.tickets where id = ticket;
  if tuser is null or (tuser <> uid and not (select private.has_permission('tickets.responder'))) then
    raise exception 'Ticket no encontrado';
  end if;
  update public.tickets
     set status = new_status, updated_at = now(),
         staff_unread = case when new_status = 'cerrado' then false else staff_unread end
   where id = ticket;
end $$;

-- Marca como leído para quien lo abre (cliente o equipo).
create or replace function public.ticket_mark_read(ticket uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); tuser uuid;
begin
  select user_id into tuser from public.tickets where id = ticket;
  if tuser is null then return; end if;
  if tuser = uid then
    update public.tickets set user_unread = false where id = ticket;
  elsif (select private.has_permission('tickets.responder')) then
    update public.tickets set staff_unread = false where id = ticket;
  end if;
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.ticket_create(text, text, text[])', 'public.ticket_post(uuid, text, text[])',
                           'public.ticket_set_status(uuid, text)', 'public.ticket_mark_read(uuid)'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
revoke execute on function private.ticket_images_ok(uuid, text[]) from public, anon, authenticated;
