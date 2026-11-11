-- Asistente: verificación técnica solo en sitios oficiales de fabricantes (lista editable en el panel).
alter table public.ai_settings
  add column if not exists web_verify boolean not null default false,
  add column if not exists official_domains text[] not null default array[
    'cummins.com', 'cumminsfiltration.com', 'perkins.com', 'cat.com', 'deere.com', 'kubota.com', 'yanmar.com',
    'deutz.com', 'hatz-diesel.com', 'weichai.com', 'donaldson.com', 'skf.com', 'grundfos.com', 'xylem.com',
    'gormanrupp.com', 'ksb.com', 'sulzer.com', 'metso.com', 'flowserve.com'
  ];
alter table public.ai_settings drop constraint if exists ai_settings_domains_check;
alter table public.ai_settings add constraint ai_settings_domains_check check (cardinality(official_domains) <= 60);

create or replace function public.assistant_context()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when s.enabled then
    jsonb_build_object(
      'enabled', true,
      'model', s.model,
      'web_verify', s.web_verify,
      'official_domains', to_jsonb(s.official_domains),
      'docs', coalesce((select jsonb_agg(jsonb_build_object('title', d.title, 'content', d.content) order by d.created_at)
                          from public.ai_documents d where d.active), '[]'::jsonb))
  else jsonb_build_object('enabled', false) end
  from public.ai_settings s where s.id;
$$;
revoke execute on function public.assistant_context() from public;
grant execute on function public.assistant_context() to anon, authenticated;
