-- Condición del producto: nuevo, usado o reconstruido. Se elige en el panel (Productos → editar);
-- los productos que ya existen quedan como «nuevo». La tabla ya tiene RLS: la columna usa las mismas políticas.
alter table public.products
  add column if not exists condition text not null default 'nuevo'
  constraint products_condition_check check (condition in ('nuevo', 'usado', 'reconstruido'));

comment on column public.products.condition is 'Condición del producto: nuevo, usado o reconstruido';

-- Catálogo de ejemplo: el motor reconstruido de muestra queda marcado como tal
update public.products set condition = 'reconstruido' where ref = 'JF-D25R' and is_demo;
