-- Imagen de la sección Beneficios del inicio, editable desde /admin/empresa.
-- Se guarda en el bucket público "catalogo" bajo sitio/; la sube quien tenga el permiso empresa.editar.

alter table public.company_settings
  add column if not exists home_benefits_image text
  check (home_benefits_image is null or home_benefits_image ~ '^sitio/[a-z0-9-]+\.(jpg|png|webp)$');

drop policy if exists catalogo_sitio_insert on storage.objects;
create policy catalogo_sitio_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'catalogo' and name like 'sitio/%' and (select private.has_permission('empresa.editar')));
