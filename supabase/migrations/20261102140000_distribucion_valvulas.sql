-- Piezas internas nuevas del despiece 3D: distribución, válvulas y alternador (con su categoría).
insert into public.categories (catalog, slug, name, engine_part_key, sort)
select 'repuesto', v.slug, v.name::jsonb, v.part, v.sort
  from (values
    ('distribucion', '{"es":"Distribución y árboles de levas","en":"Timing gears & camshafts","pt":"Distribuição e comandos de válvulas"}', 'distribucion', 22),
    ('valvulas', '{"es":"Válvulas, resortes y balancines","en":"Valves, springs & rocker arms","pt":"Válvulas, molas e balancins"}', 'valvulas', 23),
    ('alternadores', '{"es":"Alternadores y correas","en":"Alternators & belts","pt":"Alternadores e correias"}', 'alternador', 24)
  ) as v(slug, name, part, sort)
 where not exists (select 1 from public.categories c where c.catalog = 'repuesto' and (c.slug = v.slug or c.engine_part_key = v.part));
