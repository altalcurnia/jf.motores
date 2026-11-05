-- Datos legales y prueba social (RF-08 / Ley 1480): editables en /admin/empresa.
-- Nada de esto se muestra en el sitio hasta que se llena.

alter table public.company_settings
  add column if not exists legal_address text check (legal_address is null or char_length(legal_address) <= 160),
  add column if not exists founded_year int check (founded_year is null or founded_year between 1950 and 2100),
  add column if not exists prices_include_vat boolean;  -- null = sin confirmar
-- stats: {"equipos": n, "clientes": n, "municipios": n} (cifras reales; vacías no se muestran)
update public.company_settings set stats = '{}'::jsonb where jsonb_typeof(stats) <> 'object';

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  place text check (place is null or char_length(place) <= 100),
  product text check (product is null or char_length(product) <= 80),
  quote text not null check (char_length(quote) between 10 and 600),
  consent boolean not null default false,  -- el cliente autorizó publicar su testimonio
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.testimonials enable row level security;
create policy testimonials_read on public.testimonials for select
  using ((active and consent) or (select private.has_permission('empresa.editar')));
create policy testimonials_write on public.testimonials for all to authenticated
  using ((select private.has_permission('empresa.editar')))
  with check ((select private.has_permission('empresa.editar')));
