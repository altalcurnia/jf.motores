-- Versión de marca del sitio (textos y paleta): nueva, roja (nueva con rojo) o clasica.
-- brands_hidden: versiones eliminadas de las opciones (se pueden restaurar). Siempre queda al menos una.
alter table public.company_settings
  add column if not exists brand text not null default 'nueva' check (brand in ('nueva', 'roja', 'clasica')),
  add column if not exists brands_hidden text[] not null default '{}';
alter table public.company_settings drop constraint if exists company_brands_hidden_ok;
alter table public.company_settings add constraint company_brands_hidden_ok check (
  brands_hidden <@ array['nueva', 'roja', 'clasica'] and not (brand = any (brands_hidden))
);
