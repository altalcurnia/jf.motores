-- Contacto editable desde el panel: líneas directas, correo de soporte y sedes.
-- Lectura pública (company_read / branches_read); escritura con el permiso empresa.editar.

alter table public.company_settings
  add column if not exists phones jsonb not null default '[]';
alter table public.company_settings drop constraint if exists company_phones_array;
alter table public.company_settings add constraint company_phones_array check (jsonb_typeof(phones) = 'array');

-- Línea actual de WhatsApp y correo del propietario como punto de partida
update public.company_settings
   set phones = case when phones = '[]'::jsonb
                     then '[{"label":"Ventas y soporte","number":"573122110262","whatsapp":true}]'::jsonb
                     else phones end,
       email = coalesce(email, (select p.email from public.profiles p where p.is_owner order by p.created_at limit 1));

-- "Taller" pasa a "Sedes"; segunda sede en Caucasia (dirección provisional: editar en el panel)
update public.branches set name = 'Sede Medellín' where name = 'Taller Medellín';
insert into public.branches (name, city, country, address, phone, sort)
select 'Sede Caucasia', 'Caucasia', 'CO', 'Cl. 20 # 15-32', '+57 312 2110262', 2
 where not exists (select 1 from public.branches where city = 'Caucasia');
