-- Versión del motor 3D del inicio (se elige en /admin/empresa).
-- engine_model: la que ve el público; engine_models_hidden: versiones descartadas (se pueden restaurar).
alter table public.company_settings
  add column if not exists engine_model text not null default 'v1' check (engine_model ~ '^v[1-9]$'),
  add column if not exists engine_models_hidden text[] not null default '{}'
    check (engine_models_hidden <@ array['v1','v2','v3','v4','v5','v6','v7','v8','v9']);
