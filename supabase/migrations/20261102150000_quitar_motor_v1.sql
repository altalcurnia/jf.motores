-- Se retira la versión 1 del motor 3D: quedan «Plano CAD» (v2, predeterminada) y «Foto real» (v3).
alter table public.company_settings alter column engine_model set default 'v2';
update public.company_settings set engine_model = 'v2' where engine_model = 'v1';
update public.company_settings set engine_models_hidden = array_remove(engine_models_hidden, 'v1');
