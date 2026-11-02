-- Piezas nuevas del despiece 3D (modelo según los planos de la motobomba).
-- Cada pieza abre su categoría de repuestos en /[idioma]/repuestos/[pieza].
insert into public.categories (catalog, slug, name, engine_part_key, sort)
select 'repuesto', v.slug, v.name::jsonb, v.part, v.sort
  from (values
    ('acoples', '{"es":"Acoples y guardas","en":"Couplings & guards","pt":"Acoplamentos e proteções"}', 'acople', 14),
    ('admision', '{"es":"Filtros de aire y admisión","en":"Air filters & intake","pt":"Filtros de ar e admissão"}', 'admision', 15),
    ('mangueras', '{"es":"Mangueras y abrazaderas","en":"Hoses & clamps","pt":"Mangueiras e abraçadeiras"}', 'mangueras', 16),
    ('arranques', '{"es":"Motores de arranque","en":"Starter motors","pt":"Motores de partida"}', 'arranque', 17),
    ('inyeccion', '{"es":"Inyección diésel y aceleradores","en":"Diesel injection & throttles","pt":"Injeção diesel e aceleradores"}', 'inyeccion', 18),
    ('carteres', '{"es":"Cárteres y empaques","en":"Oil pans & gaskets","pt":"Cárteres e juntas"}', 'carter', 19),
    ('soportes', '{"es":"Soportes de motor","en":"Engine mounts","pt":"Coxins do motor"}', 'soportes', 20)
  ) as v(slug, name, part, sort)
 where not exists (select 1 from public.categories c where c.catalog = 'repuesto' and (c.slug = v.slug or c.engine_part_key = v.part));
