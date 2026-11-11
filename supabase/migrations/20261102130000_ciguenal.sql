-- Cigüeñal: pieza nueva del despiece 3D (con su categoría de repuestos).
insert into public.categories (catalog, slug, name, engine_part_key, sort)
select 'repuesto', 'ciguenales', '{"es":"Cigüeñales y cojinetes","en":"Crankshafts & bearings","pt":"Virabrequins e bronzinas"}'::jsonb, 'ciguenal', 21
 where not exists (select 1 from public.categories c where c.catalog = 'repuesto' and (c.slug = 'ciguenales' or c.engine_part_key = 'ciguenal'));
