-- Datos de ejemplo (is_demo = true). Se borran desde el panel: Productos → "Borrar datos de ejemplo".
-- Generado por scripts/demo/sql.mjs. Imágenes: public/demo/*.jpg (ilustraciones de referencia).

alter table public.products add column if not exists is_demo boolean not null default false;
alter table public.engine_models add column if not exists is_demo boolean not null default false;

-- Reemplaza los 6 equipos iniciales (tenían fotos en un servidor externo temporal)
delete from public.products where ref in ('JF-M12','JF-M25','JF-M40','JF-M30','JF-M18','JF-M25B');

insert into public.engine_models (brand, model, notes, is_demo) values
  ('JF', 'D18-2C', 'Diésel 2 cilindros, 18 HP (ejemplo)', true),
  ('JF', 'D25-4C', 'Diésel 4 cilindros, 25 HP (ejemplo)', true),
  ('JF', 'D40-4CT', 'Diésel 4 cilindros turbo, 40 HP (ejemplo)', true)
on conflict (brand, model) do update set notes = excluded.notes, is_demo = true;

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('motobomba', (select id from public.categories where slug = 'motobombas-diesel'), 'JF-M12', 'jf-m12', '{"es":"Motobomba JF-M12","en":"JF-M12 pump set","pt":"Motobomba JF-M12"}'::jsonb, '{"es":"Compacta · socavón","en":"Compact · underground","pt":"Compacta · galeria"}'::jsonb, '{"es":"Motobomba diésel compacta para desagüe de socavón y frentes estrechos. Fácil de transportar y de arrancar en frío.","en":"Compact diesel pump set for underground dewatering and narrow faces. Easy to move and to cold-start.","pt":"Motobomba a diesel compacta para drenagem de galerias e frentes estreitas. Fácil de transportar e de dar partida a frio."}'::jsonb,
  14500000, 'disponible', '{"hp":12,"succion_in":4,"descarga_in":3,"caudal_lpm":1800,"cabeza_m":45,"rpm":3000,"arranque":"Eléctrico","peso_kg":210}'::jsonb, (select id from public.engine_models where brand = 'JF' and model = 'D18-2C'), false,
  now() - interval '1 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/jf-m12.jpg', name, true, 0 from public.products where ref = 'JF-M12';

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('motobomba', (select id from public.categories where slug = 'motobombas-diesel'), 'JF-M25', 'jf-m25', '{"es":"Motobomba JF-M25","en":"JF-M25 pump set","pt":"Motobomba JF-M25"}'::jsonb, '{"es":"Minera · tajo abierto","en":"Mining · open pit","pt":"Mineração · céu aberto"}'::jsonb, '{"es":"Motobomba para tajo abierto: caudal alto y torque constante con lodo y sólidos en suspensión.","en":"Open-pit pump set: high flow and steady torque with slurry and suspended solids.","pt":"Motobomba para mina a céu aberto: alta vazão e torque constante com lama e sólidos em suspensão."}'::jsonb,
  24900000, 'disponible', '{"hp":25,"succion_in":6,"descarga_in":4,"caudal_lpm":4000,"cabeza_m":80,"rpm":2600,"arranque":"Eléctrico","peso_kg":420}'::jsonb, (select id from public.engine_models where brand = 'JF' and model = 'D25-4C'), true,
  now() - interval '2 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/jf-m25.jpg', name, true, 0 from public.products where ref = 'JF-M25';
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/jf-m25-2.jpg', name, true, 1 from public.products where ref = 'JF-M25';

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('motobomba', (select id from public.categories where slug = 'motobombas-diesel'), 'JF-M40', 'jf-m40', '{"es":"Motobomba JF-M40","en":"JF-M40 pump set","pt":"Motobomba JF-M40"}'::jsonb, '{"es":"Alta montaña · +3 000 m","en":"High altitude · 3,000 m+","pt":"Alta montanha · +3.000 m"}'::jsonb, '{"es":"Motor turboalimentado para conservar potencia sobre los 3 000 m s. n. m. Pensada para cabezas altas y bombeo continuo.","en":"Turbocharged engine to keep power above 3,000 m. Built for high head and continuous pumping.","pt":"Motor turboalimentado para manter a potência acima de 3.000 m. Feita para grandes alturas e bombeamento contínuo."}'::jsonb,
  38500000, 'disponible', '{"hp":40,"succion_in":8,"descarga_in":6,"caudal_lpm":6500,"cabeza_m":95,"rpm":2400,"arranque":"Eléctrico","peso_kg":610}'::jsonb, (select id from public.engine_models where brand = 'JF' and model = 'D40-4CT'), false,
  now() - interval '3 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/jf-m40.jpg', name, true, 0 from public.products where ref = 'JF-M40';

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('motobomba', (select id from public.categories where slug = 'motobombas-diesel'), 'JF-M30', 'jf-m30', '{"es":"Motobomba JF-M30","en":"JF-M30 pump set","pt":"Motobomba JF-M30"}'::jsonb, '{"es":"Tajo abierto","en":"Open pit","pt":"Céu aberto"}'::jsonb, '{"es":"Unidad entregada para drenado de tajo.","en":"Unit delivered for open-pit drainage.","pt":"Unidade entregue para drenagem de cava."}'::jsonb,
  31000000, 'vendido', '{"hp":30,"succion_in":6,"descarga_in":4,"caudal_lpm":5000,"cabeza_m":85}'::jsonb, (select id from public.engine_models where brand = 'JF' and model = 'D40-4CT'), false,
  now() - interval '400 days', now() - interval '400 days', true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/jf-m30.jpg', name, true, 0 from public.products where ref = 'JF-M30';

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('motobomba', (select id from public.categories where slug = 'motobombas-diesel'), 'JF-M18', 'jf-m18', '{"es":"Motobomba JF-M18","en":"JF-M18 pump set","pt":"Motobomba JF-M18"}'::jsonb, '{"es":"Draga aluvial · lodo abrasivo","en":"Alluvial dredge · abrasive slurry","pt":"Draga aluvial · lama abrasiva"}'::jsonb, '{"es":"Unidad entregada para bombeo de lodo abrasivo.","en":"Unit delivered for abrasive slurry pumping.","pt":"Unidade entregue para bombeamento de lama abrasiva."}'::jsonb,
  19500000, 'vendido', '{"hp":18,"succion_in":4,"descarga_in":4,"caudal_lpm":2600,"cabeza_m":55}'::jsonb, (select id from public.engine_models where brand = 'JF' and model = 'D18-2C'), false,
  now() - interval '700 days', now() - interval '700 days', true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/jf-m18.jpg', name, true, 0 from public.products where ref = 'JF-M18';

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('motobomba', (select id from public.categories where slug = 'motobombas-diesel'), 'JF-M25B', 'jf-m25b', '{"es":"Motobomba JF-M25 B","en":"JF-M25 B pump set","pt":"Motobomba JF-M25 B"}'::jsonb, '{"es":"Desagüe de socavón","en":"Underground dewatering","pt":"Drenagem de galeria"}'::jsonb, '{"es":"Unidad entregada para desagüe de socavón.","en":"Unit delivered for underground dewatering.","pt":"Unidade entregue para drenagem de galeria."}'::jsonb,
  24900000, 'vendido', '{"hp":25,"succion_in":6,"descarga_in":4,"caudal_lpm":4000,"cabeza_m":80}'::jsonb, (select id from public.engine_models where brand = 'JF' and model = 'D25-4C'), false,
  now() - interval '120 days', now() - interval '120 days', true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/jf-m25b.jpg', name, true, 0 from public.products where ref = 'JF-M25B';

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('motor', (select id from public.categories where slug = 'motores-diesel'), 'JF-D18', 'jf-d18', '{"es":"Motor diésel JF-D18","en":"JF-D18 diesel engine","pt":"Motor a diesel JF-D18"}'::jsonb, '{"es":"2 cilindros · 18 HP","en":"2 cylinders · 18 HP","pt":"2 cilindros · 18 HP"}'::jsonb, '{"es":"Motor diésel de 2 cilindros refrigerado por agua, para motobombas compactas.","en":"Water-cooled 2-cylinder diesel engine for compact pump sets.","pt":"Motor a diesel de 2 cilindros refrigerado a água, para motobombas compactas."}'::jsonb,
  7900000, 'disponible', '{"hp":18,"cilindros":2,"rpm":3000,"arranque":"Eléctrico","refrigeracion":"Agua","peso_kg":160}'::jsonb, (select id from public.engine_models where brand = 'JF' and model = 'D18-2C'), false,
  now() - interval '4 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/jf-d18.jpg', name, true, 0 from public.products where ref = 'JF-D18';

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('motor', (select id from public.categories where slug = 'motores-diesel'), 'JF-D25', 'jf-d25', '{"es":"Motor diésel JF-D25","en":"JF-D25 diesel engine","pt":"Motor a diesel JF-D25"}'::jsonb, '{"es":"4 cilindros · 25 HP","en":"4 cylinders · 25 HP","pt":"4 cilindros · 25 HP"}'::jsonb, '{"es":"Motor de 4 cilindros con curva de torque plana, el corazón de la JF-M25.","en":"4-cylinder engine with a flat torque curve, the heart of the JF-M25.","pt":"Motor de 4 cilindros com curva de torque plana, o coração da JF-M25."}'::jsonb,
  11500000, 'disponible', '{"hp":25,"cilindros":4,"rpm":2600,"arranque":"Eléctrico","refrigeracion":"Agua","peso_kg":260}'::jsonb, (select id from public.engine_models where brand = 'JF' and model = 'D25-4C'), true,
  now() - interval '5 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/jf-d25.jpg', name, true, 0 from public.products where ref = 'JF-D25';

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('motor', (select id from public.categories where slug = 'motores-diesel'), 'JF-D40T', 'jf-d40t', '{"es":"Motor diésel JF-D40T","en":"JF-D40T diesel engine","pt":"Motor a diesel JF-D40T"}'::jsonb, '{"es":"4 cilindros turbo · 40 HP","en":"4-cylinder turbo · 40 HP","pt":"4 cilindros turbo · 40 HP"}'::jsonb, '{"es":"Turboalimentado para trabajo en altura sin perder potencia.","en":"Turbocharged for high-altitude work without losing power.","pt":"Turboalimentado para trabalho em altitude sem perder potência."}'::jsonb,
  18900000, 'disponible', '{"hp":40,"cilindros":4,"rpm":2400,"arranque":"Eléctrico","refrigeracion":"Agua","peso_kg":330}'::jsonb, (select id from public.engine_models where brand = 'JF' and model = 'D40-4CT'), false,
  now() - interval '6 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/jf-d40t.jpg', name, true, 0 from public.products where ref = 'JF-D40T';

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('motor', (select id from public.categories where slug = 'motores-diesel'), 'JF-D25R', 'jf-d25r', '{"es":"Motor diésel JF-D25 reconstruido","en":"Rebuilt JF-D25 diesel engine","pt":"Motor a diesel JF-D25 recondicionado"}'::jsonb, '{"es":"Reconstruido · 25 HP","en":"Rebuilt · 25 HP","pt":"Recondicionado · 25 HP"}'::jsonb, '{"es":"Motor reconstruido en taller con repuestos nuevos.","en":"Workshop-rebuilt engine with new parts.","pt":"Motor recondicionado na oficina com peças novas."}'::jsonb,
  7200000, 'vendido', '{"hp":25,"cilindros":4,"rpm":2600}'::jsonb, (select id from public.engine_models where brand = 'JF' and model = 'D25-4C'), false,
  now() - interval '90 days', now() - interval '90 days', true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/jf-d25r.jpg', name, true, 0 from public.products where ref = 'JF-D25R';

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('repuesto', (select id from public.categories where slug = 'radiadores'), 'RAD-D25', 'radiador-d25', '{"es":"Radiador de aluminio 4 filas","en":"4-row aluminium radiator","pt":"Radiador de alumínio 4 fileiras"}'::jsonb, '{"es":"Para JF-D25 y JF-D40T","en":"For JF-D25 and JF-D40T","pt":"Para JF-D25 e JF-D40T"}'::jsonb, '{}'::jsonb,
  1250000, 'disponible', '{"material":"Aluminio","filas":4}'::jsonb, null, false,
  now() - interval '7 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/radiador-d25.jpg', name, true, 0 from public.products where ref = 'RAD-D25';
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'RAD-D25'), (select id from public.engine_models where brand = 'JF' and model = 'D25-4C');
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'RAD-D25'), (select id from public.engine_models where brand = 'JF' and model = 'D40-4CT');

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('repuesto', (select id from public.categories where slug = 'pistones'), 'PIS-D25', 'kit-piston-d25', '{"es":"Kit de pistón con anillos Ø98","en":"Ø98 piston kit with rings","pt":"Kit de pistão com anéis Ø98"}'::jsonb, '{"es":"Pistón, pasador, seguros y anillos","en":"Piston, pin, clips and rings","pt":"Pistão, pino, travas e anéis"}'::jsonb, '{}'::jsonb,
  420000, 'disponible', '{"diametro_mm":98}'::jsonb, null, false,
  now() - interval '8 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/kit-piston-d25.jpg', name, true, 0 from public.products where ref = 'PIS-D25';
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'PIS-D25'), (select id from public.engine_models where brand = 'JF' and model = 'D25-4C');

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('repuesto', (select id from public.categories where slug = 'pistones'), 'ANI-D18', 'anillos-d18', '{"es":"Juego de anillos Ø92","en":"Ø92 piston ring set","pt":"Jogo de anéis Ø92"}'::jsonb, '{"es":"Compresión y aceite, por cilindro","en":"Compression and oil, per cylinder","pt":"Compressão e óleo, por cilindro"}'::jsonb, '{}'::jsonb,
  95000, 'disponible', '{"diametro_mm":92}'::jsonb, null, false,
  now() - interval '9 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/anillos-d18.jpg', name, true, 0 from public.products where ref = 'ANI-D18';
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'ANI-D18'), (select id from public.engine_models where brand = 'JF' and model = 'D18-2C');

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('repuesto', (select id from public.categories where slug = 'culatas'), 'EMP-D25', 'empaque-culata-d25', '{"es":"Empaque de culata","en":"Cylinder head gasket","pt":"Junta do cabeçote"}'::jsonb, '{"es":"Multicapa de acero","en":"Multi-layer steel","pt":"Multicamadas de aço"}'::jsonb, '{}'::jsonb,
  110000, 'disponible', '{"material":"Acero multicapa"}'::jsonb, null, false,
  now() - interval '10 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/empaque-culata-d25.jpg', name, true, 0 from public.products where ref = 'EMP-D25';
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'EMP-D25'), (select id from public.engine_models where brand = 'JF' and model = 'D25-4C');

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('repuesto', (select id from public.categories where slug = 'culatas'), 'VAL-D25', 'valvulas-d25', '{"es":"Juego de válvulas (8)","en":"Valve set (8)","pt":"Jogo de válvulas (8)"}'::jsonb, '{"es":"4 de admisión y 4 de escape","en":"4 intake and 4 exhaust","pt":"4 de admissão e 4 de escape"}'::jsonb, '{}'::jsonb,
  360000, 'disponible', '{"unidades":8}'::jsonb, null, false,
  now() - interval '11 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/valvulas-d25.jpg', name, true, 0 from public.products where ref = 'VAL-D25';
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'VAL-D25'), (select id from public.engine_models where brand = 'JF' and model = 'D25-4C');
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'VAL-D25'), (select id from public.engine_models where brand = 'JF' and model = 'D40-4CT');

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('repuesto', (select id from public.categories where slug = 'camisas'), 'CAM-D25', 'camisa-d25', '{"es":"Camisa de cilindro","en":"Cylinder liner","pt":"Camisa de cilindro"}'::jsonb, '{"es":"Hierro fundido centrifugado","en":"Centrifugally cast iron","pt":"Ferro fundido centrifugado"}'::jsonb, '{}'::jsonb,
  280000, 'disponible', '{"diametro_mm":98}'::jsonb, null, false,
  now() - interval '12 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/camisa-d25.jpg', name, true, 0 from public.products where ref = 'CAM-D25';
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'CAM-D25'), (select id from public.engine_models where brand = 'JF' and model = 'D25-4C');

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('repuesto', (select id from public.categories where slug = 'escapes'), 'SIL-3', 'silenciador-3', '{"es":"Silenciador de escape 3″","en":"3″ exhaust muffler","pt":"Silenciador de escapamento 3″"}'::jsonb, '{"es":"Universal para la línea JF","en":"Universal for the JF line","pt":"Universal para a linha JF"}'::jsonb, '{}'::jsonb,
  230000, 'disponible', '{"diametro_in":3}'::jsonb, null, false,
  now() - interval '13 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/silenciador-3.jpg', name, true, 0 from public.products where ref = 'SIL-3';
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'SIL-3'), (select id from public.engine_models where brand = 'JF' and model = 'D18-2C');
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'SIL-3'), (select id from public.engine_models where brand = 'JF' and model = 'D25-4C');
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'SIL-3'), (select id from public.engine_models where brand = 'JF' and model = 'D40-4CT');

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('repuesto', (select id from public.categories where slug = 'tanques'), 'TAN-40', 'tanque-40l', '{"es":"Tanque de combustible 40 L","en":"40 L fuel tank","pt":"Tanque de combustível 40 L"}'::jsonb, '{"es":"Con tapa y nivel","en":"With cap and level gauge","pt":"Com tampa e indicador de nível"}'::jsonb, '{}'::jsonb,
  390000, 'disponible', '{"capacidad_l":40}'::jsonb, null, false,
  now() - interval '14 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/tanque-40l.jpg', name, true, 0 from public.products where ref = 'TAN-40';
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'TAN-40'), (select id from public.engine_models where brand = 'JF' and model = 'D18-2C');
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'TAN-40'), (select id from public.engine_models where brand = 'JF' and model = 'D25-4C');
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'TAN-40'), (select id from public.engine_models where brand = 'JF' and model = 'D40-4CT');

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('repuesto', (select id from public.categories where slug = 'ventiladores'), 'VEN-450', 'ventilador-450', '{"es":"Ventilador de 6 aspas Ø450","en":"Ø450 6-blade fan","pt":"Ventilador de 6 pás Ø450"}'::jsonb, '{"es":"Plástico reforzado","en":"Reinforced plastic","pt":"Plástico reforçado"}'::jsonb, '{}'::jsonb,
  180000, 'disponible', '{"diametro_mm":450,"aspas":6}'::jsonb, null, false,
  now() - interval '15 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/ventilador-450.jpg', name, true, 0 from public.products where ref = 'VEN-450';
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'VEN-450'), (select id from public.engine_models where brand = 'JF' and model = 'D25-4C');
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'VEN-450'), (select id from public.engine_models where brand = 'JF' and model = 'D40-4CT');

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('repuesto', (select id from public.categories where slug = 'volantes'), 'VOL-D18', 'volante-d18', '{"es":"Volante de inercia","en":"Flywheel","pt":"Volante do motor"}'::jsonb, '{"es":"Con corona dentada","en":"With ring gear","pt":"Com coroa dentada"}'::jsonb, '{}'::jsonb,
  650000, 'vendido', '{"dientes":112}'::jsonb, null, false,
  now() - interval '30 days', now() - interval '30 days', true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/volante-d18.jpg', name, true, 0 from public.products where ref = 'VOL-D18';
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'VOL-D18'), (select id from public.engine_models where brand = 'JF' and model = 'D18-2C');

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('repuesto', (select id from public.categories where slug = 'bombas'), 'IMP-6', 'impulsor-6', '{"es":"Impulsor 6″ alto cromo","en":"6″ high-chrome impeller","pt":"Rotor 6″ alto cromo"}'::jsonb, '{"es":"Resistente a la abrasión","en":"Abrasion resistant","pt":"Resistente à abrasão"}'::jsonb, '{}'::jsonb,
  980000, 'disponible', '{"diametro_in":6,"material":"Hierro alto cromo"}'::jsonb, null, false,
  now() - interval '16 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/impulsor-6.jpg', name, true, 0 from public.products where ref = 'IMP-6';
insert into public.part_compatibility (part_id, product_id) select (select id from public.products where ref = 'IMP-6'), (select id from public.products where ref = 'JF-M25');
insert into public.part_compatibility (part_id, product_id) select (select id from public.products where ref = 'IMP-6'), (select id from public.products where ref = 'JF-M25B');
insert into public.part_compatibility (part_id, product_id) select (select id from public.products where ref = 'IMP-6'), (select id from public.products where ref = 'JF-M30');

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('repuesto', (select id from public.categories where slug = 'bombas'), 'SEL-6', 'sello-mecanico-6', '{"es":"Sello mecánico para bomba 6″","en":"6″ pump mechanical seal","pt":"Selo mecânico para bomba 6″"}'::jsonb, '{"es":"Carburo de silicio","en":"Silicon carbide","pt":"Carbeto de silício"}'::jsonb, '{}'::jsonb,
  210000, 'disponible', '{"caras":"SiC / SiC"}'::jsonb, null, false,
  now() - interval '17 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/sello-mecanico-6.jpg', name, true, 0 from public.products where ref = 'SEL-6';
insert into public.part_compatibility (part_id, product_id) select (select id from public.products where ref = 'SEL-6'), (select id from public.products where ref = 'JF-M25');
insert into public.part_compatibility (part_id, product_id) select (select id from public.products where ref = 'SEL-6'), (select id from public.products where ref = 'JF-M40');

insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('repuesto', (select id from public.categories where slug = 'tableros'), 'TAB-HOR', 'tablero-horometro', '{"es":"Tablero con horómetro y alarmas","en":"Control panel with hour meter and alarms","pt":"Painel com horímetro e alarmes"}'::jsonb, '{"es":"Presión de aceite y temperatura","en":"Oil pressure and temperature","pt":"Pressão de óleo e temperatura"}'::jsonb, '{}'::jsonb,
  540000, 'disponible', '{"voltaje_v":12}'::jsonb, null, false,
  now() - interval '18 days', null, true);
insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, '/demo/tablero-horometro.jpg', name, true, 0 from public.products where ref = 'TAB-HOR';
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'TAB-HOR'), (select id from public.engine_models where brand = 'JF' and model = 'D18-2C');
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'TAB-HOR'), (select id from public.engine_models where brand = 'JF' and model = 'D25-4C');
insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = 'TAB-HOR'), (select id from public.engine_models where brand = 'JF' and model = 'D40-4CT');

