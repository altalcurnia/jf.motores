-- =============================================================================
-- JF Motores · Datos iniciales
-- =============================================================================

-- ---------- Roles ----------
insert into public.roles (key, name, is_internal, description) values
  ('admin',   'Administrador', true,  'Acceso total, incluida la gestión de usuarios y permisos'),
  ('editor',  'Editor',        true,  'Catálogo, contenido de la empresa, precios y formularios'),
  ('asesor',  'Asesor',        true,  'Ve y gestiona las cotizaciones que le asignan'),
  ('cliente', 'Cliente',       false, 'Usuario externo registrado');

-- ---------- Permisos ----------
insert into public.permissions (key, description) values
  ('catalogo.ver',          'Ver todo el catálogo, incluidos borradores'),
  ('catalogo.editar',       'Crear y editar productos, categorías, fotos y modelos 3D'),
  ('precios.editar',        'Editar tasas de cambio y precios por moneda'),
  ('empresa.editar',        'Editar datos de la empresa y sedes'),
  ('asesores.gestionar',    'Gestionar asesores y reglas de asignación'),
  ('leads.ver_todos',       'Ver todas las cotizaciones'),
  ('leads.gestionar',       'Cambiar estado y notas de cualquier cotización'),
  ('formularios.gestionar', 'Crear y activar formularios'),
  ('equipos.ver',           'Ver unidades vendidas'),
  ('equipos.gestionar',     'Registrar unidades vendidas y asignar propietarios'),
  ('telemetria.ver',        'Ver telemetría de todos los equipos'),
  ('usuarios.ver',          'Ver usuarios'),
  ('usuarios.gestionar',    'Invitar usuarios, cambiar roles y permisos'),
  ('auditoria.ver',         'Ver el historial de cambios');

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p where r.key = 'admin';

insert into public.role_permissions (role_id, permission_key)
select r.id, p from public.roles r,
  unnest(array['catalogo.ver', 'catalogo.editar', 'precios.editar', 'empresa.editar',
               'formularios.gestionar', 'equipos.ver', 'leads.ver_todos']) as p
where r.key = 'editor';

insert into public.role_permissions (role_id, permission_key)
select r.id, p from public.roles r,
  unnest(array['catalogo.ver', 'equipos.ver']) as p
where r.key = 'asesor';

-- ---------- Administrador principal ----------
insert into public.admin_bootstrap (email) values ('altalcurniaoficial@gmail.com');

-- ---------- Categorías ----------
insert into public.categories (catalog, slug, name, sort) values
  ('motobomba', 'motobombas-diesel', '{"es":"Motobombas diésel","en":"Diesel pump sets","pt":"Motobombas a diesel"}', 1),
  ('motor',     'motores-diesel',    '{"es":"Motores diésel","en":"Diesel engines","pt":"Motores a diesel"}', 1);

-- Repuestos: una categoría por pieza del motor 3D (+ ampliables desde el panel)
insert into public.categories (catalog, slug, name, engine_part_key, sort) values
  ('repuesto', 'radiadores',  '{"es":"Radiadores","en":"Radiators","pt":"Radiadores"}',                         'radiador', 1),
  ('repuesto', 'culatas',     '{"es":"Culatas y válvulas","en":"Cylinder heads and valves","pt":"Cabeçotes e válvulas"}', 'culata', 2),
  ('repuesto', 'pistones',    '{"es":"Pistones","en":"Pistons","pt":"Pistões"}',                                'pistones', 3),
  ('repuesto', 'camisas',     '{"es":"Camisas","en":"Cylinder liners","pt":"Camisas"}',                         'camisas', 4),
  ('repuesto', 'bloques',     '{"es":"Bloques","en":"Engine blocks","pt":"Blocos"}',                            'bloque', 5),
  ('repuesto', 'escapes',     '{"es":"Escapes","en":"Exhausts","pt":"Escapamentos"}',                           'escape', 6),
  ('repuesto', 'tanques',     '{"es":"Tanques de combustible","en":"Fuel tanks","pt":"Tanques de combustível"}', 'tanque', 7),
  ('repuesto', 'ventiladores','{"es":"Ventiladores","en":"Fans","pt":"Ventiladores"}',                          'ventilador', 8),
  ('repuesto', 'volantes',    '{"es":"Volantes","en":"Flywheels","pt":"Volantes"}',                             'volante', 9),
  ('repuesto', 'bombas',      '{"es":"Bombas e impulsores","en":"Pumps and impellers","pt":"Bombas e rotores"}', 'bomba', 10),
  ('repuesto', 'tableros',    '{"es":"Tableros e instrumentos","en":"Control panels and gauges","pt":"Painéis e instrumentos"}', 'tablero', 11),
  ('repuesto', 'chasis',      '{"es":"Chasis y bases","en":"Skid frames and bases","pt":"Chassis e bases"}',    'chasis', 12),
  ('repuesto', 'electricos',  '{"es":"Sistema eléctrico e iluminación","en":"Electrical and lighting","pt":"Sistema elétrico e iluminação"}', 'luz', 13);

-- ---------- Equipos de ejemplo (del sitio original; reemplazar por los reales) ----------
with cat as (select id from public.categories where slug = 'motobombas-diesel')
insert into public.products (catalog, category_id, ref, slug, name, summary, status, specs, published_at, sold_at)
select 'motobomba', cat.id, v.ref, v.slug, v.name::jsonb, v.summary::jsonb, v.status::public.product_status, v.specs::jsonb,
       now() - v.age, case when v.status = 'vendido' then now() - v.age else null end
from cat, (values
  ('JF-M12',  'jf-m12',  '{"es":"JF-M12","en":"JF-M12","pt":"JF-M12"}',
   '{"es":"Compacta · socavón","en":"Compact · underground","pt":"Compacta · galeria"}', 'disponible',
   '{"hp":12,"succion_in":4,"caudal_lpm":1800,"cabeza_m":45}', interval '1 day'),
  ('JF-M25',  'jf-m25',  '{"es":"JF-M25","en":"JF-M25","pt":"JF-M25"}',
   '{"es":"Minera · tajo abierto","en":"Mining · open pit","pt":"Mineração · céu aberto"}', 'disponible',
   '{"hp":25,"succion_in":6,"caudal_lpm":4000,"cabeza_m":80}', interval '2 days'),
  ('JF-M40',  'jf-m40',  '{"es":"JF-M40","en":"JF-M40","pt":"JF-M40"}',
   '{"es":"Alta montaña · +3 000 m","en":"High altitude · 3,000 m+","pt":"Alta montanha · +3.000 m"}', 'disponible',
   '{"hp":40,"succion_in":8,"caudal_lpm":6500,"cabeza_m":95}', interval '3 days'),
  ('JF-M30',  'jf-m30',  '{"es":"JF-M30","en":"JF-M30","pt":"JF-M30"}',
   '{"es":"Tajo abierto","en":"Open pit","pt":"Céu aberto"}', 'vendido',
   '{"hp":30}', interval '400 days'),
  ('JF-M18',  'jf-m18',  '{"es":"JF-M18","en":"JF-M18","pt":"JF-M18"}',
   '{"es":"Draga aluvial · lodo abrasivo","en":"Alluvial dredge · abrasive slurry","pt":"Draga aluvial · lama abrasiva"}', 'vendido',
   '{"hp":18}', interval '700 days'),
  ('JF-M25B', 'jf-m25b', '{"es":"JF-M25 B","en":"JF-M25 B","pt":"JF-M25 B"}',
   '{"es":"Desagüe de socavón","en":"Underground dewatering","pt":"Drenagem de galeria"}', 'vendido',
   '{"hp":25,"succion_in":6}', interval '120 days')
) as v(ref, slug, name, summary, status, specs, age);

-- Fotos de referencia temporales (servidor externo) — se reemplazan desde el panel
insert into public.product_images (product_id, path, alt, is_reference, sort)
select p.id, 'https://image.qwenlm.ai/public_source/0b9b4f50-6968-461a-9931-f52210560732/' || v.file,
       jsonb_build_object('es', 'Motobomba ' || p.ref, 'en', 'Pump set ' || p.ref, 'pt', 'Motobomba ' || p.ref), true, 0
from public.products p join (values
  ('JF-M12',  '1e9619207-c788-4e55-a48f-fa2fabac43cd.png'),
  ('JF-M25',  '165e11408-37e4-4eec-908d-1dfbb476b268.png'),
  ('JF-M40',  '171e25dc3-f68c-49db-af7c-8d1254a7094c.png'),
  ('JF-M30',  '14edd4c60-c8fa-4e3c-8f57-fac31d7f7ef8.png'),
  ('JF-M18',  '1da49a78f-c3fc-4928-b82a-0ba6f02a7cff.png'),
  ('JF-M25B', '1241582a4-942b-4d46-a723-f22f9bbf2a73.png')
) as v(ref, file) on v.ref = p.ref;

-- ---------- Empresa y sede ----------
insert into public.company_settings (trade_name, texts) values (
  'JF Motores',
  '{"slogan":{"es":"Tranquilidad y confianza","en":"Peace of mind and reliability","pt":"Tranquilidade e confiança"}}'
);

insert into public.branches (name, city, country, address, phone, sort) values
  ('Taller Medellín', 'Medellín', 'CO', 'Cra. 52 # 12-40', '+57 312 2110262', 1);

-- ---------- Asesor de respaldo (siempre debe existir uno) ----------
insert into public.advisors (name, title, phone_e164, languages, is_fallback, sort) values
  ('JF Motores', '{"es":"Ventas","en":"Sales","pt":"Vendas"}', '573122110262', '{es}', true, 0);

insert into public.exchange_rates (currency, per_cop, is_manual) values ('COP', 1, true);
