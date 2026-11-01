-- Asistente de ventas con IA (DeepSeek). Responde solo con los documentos (PDF) cargados en el panel.
-- La clave de DeepSeek vive en Vercel (DEEPSEEK_API_KEY), nunca en la base de datos.

insert into public.permissions (key, description)
values ('asistente.gestionar', 'Configurar el asistente de IA y sus documentos')
on conflict (key) do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, 'asistente.gestionar' from public.roles r where r.key = 'admin'
on conflict do nothing;

-- -------------------------------------------------------------- Ajustes (fila única)
create table if not exists public.ai_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  model text not null default 'deepseek-flash' check (model ~ '^[a-z0-9][a-z0-9.\-]{2,39}$'),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.ai_settings (id) values (true) on conflict (id) do nothing;
alter table public.ai_settings enable row level security;
-- Si está activo o no es público (decide si se muestra el botón de chat)
create policy ai_settings_read on public.ai_settings for select using (true);
create policy ai_settings_write on public.ai_settings for update to authenticated
  using ((select private.has_permission('asistente.gestionar')))
  with check ((select private.has_permission('asistente.gestionar')));

-- -------------------------------------------------------------- Documentos (única fuente de información)
create table if not exists public.ai_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 2 and 120),
  file_path text,
  content text not null check (length(content) between 1 and 400000),
  active boolean not null default true,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);
create index if not exists ai_documents_created_by_idx on public.ai_documents (created_by);
alter table public.ai_documents enable row level security;
create policy ai_documents_staff on public.ai_documents for all to authenticated
  using ((select private.has_permission('asistente.gestionar')))
  with check ((select private.has_permission('asistente.gestionar')));

-- PDFs originales (privados)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('conocimiento', 'conocimiento', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;
create policy conocimiento_read on storage.objects for select to authenticated
  using (bucket_id = 'conocimiento' and (select private.has_permission('asistente.gestionar')));
create policy conocimiento_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'conocimiento' and (select private.has_permission('asistente.gestionar')));
create policy conocimiento_delete on storage.objects for delete to authenticated
  using (bucket_id = 'conocimiento' and (select private.has_permission('asistente.gestionar')));

-- -------------------------------------------------------------- Contexto para el chat público
-- Solo entrega el texto de los documentos activos cuando el asistente está encendido.
-- Lo que se cargue aquí lo puede leer el asistente público: no subir información confidencial.
create or replace function public.assistant_context()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when s.enabled then
    jsonb_build_object(
      'enabled', true,
      'model', s.model,
      'docs', coalesce((select jsonb_agg(jsonb_build_object('title', d.title, 'content', d.content) order by d.created_at)
                          from public.ai_documents d where d.active), '[]'::jsonb))
  else jsonb_build_object('enabled', false) end
  from public.ai_settings s where s.id;
$$;
revoke execute on function public.assistant_context() from public;
grant execute on function public.assistant_context() to anon, authenticated;
