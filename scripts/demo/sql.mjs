// Genera supabase/migrations/…_datos_ejemplo.sql a partir de dataset.mjs
import { writeFileSync } from "node:fs";
import { engineModels, products } from "./dataset.mjs";

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const j = (o) => `${q(JSON.stringify(o ?? {}))}::jsonb`;
let sql = `-- Datos de ejemplo (is_demo = true). Se borran desde el panel: Productos → "Borrar datos de ejemplo".
-- Generado por scripts/demo/sql.mjs. Imágenes: public/demo/*.jpg (ilustraciones de referencia).

alter table public.products add column if not exists is_demo boolean not null default false;
alter table public.engine_models add column if not exists is_demo boolean not null default false;

-- Reemplaza los 6 equipos iniciales (tenían fotos en un servidor externo temporal)
delete from public.products where ref in ('JF-M12','JF-M25','JF-M40','JF-M30','JF-M18','JF-M25B');

insert into public.engine_models (brand, model, notes, is_demo) values
${engineModels.map((m) => `  (${q(m.brand)}, ${q(m.model)}, ${q(m.notes)}, true)`).join(",\n")}
on conflict (brand, model) do update set notes = excluded.notes, is_demo = true;

`;
const em = (key) => {
  const m = engineModels.find((x) => x.key === key);
  return `(select id from public.engine_models where brand = ${q(m.brand)} and model = ${q(m.model)})`;
};
for (const p of products) {
  sql += `insert into public.products (catalog, category_id, ref, slug, name, summary, description, price_cop, status, specs, engine_model_id, featured, published_at, sold_at, is_demo)
values ('${p.catalog}', (select id from public.categories where slug = ${q(p.category)}), ${q(p.ref)}, ${q(p.slug)}, ${j(p.name)}, ${j(p.summary)}, ${j(p.description ?? {})},
  ${p.price ?? "null"}, '${p.status}', ${j(p.specs)}, ${p.engine ? em(p.engine) : "null"}, ${p.featured ? "true" : "false"},
  now() - interval '${p.days} days', ${p.status === "vendido" ? `now() - interval '${p.days} days'` : "null"}, true);\n`;
  const imgs = [`/demo/${p.slug}.jpg`, ...(p.extraArt ? [`/demo/${p.slug}-2.jpg`] : [])];
  imgs.forEach((path, i) => {
    sql += `insert into public.product_images (product_id, path, alt, is_reference, sort)
select id, ${q(path)}, name, true, ${i} from public.products where ref = ${q(p.ref)};\n`;
  });
  for (const k of p.compatModels ?? []) {
    sql += `insert into public.part_compatibility (part_id, engine_model_id) select (select id from public.products where ref = ${q(p.ref)}), ${em(k)};\n`;
  }
  for (const r of p.compatProducts ?? []) {
    sql += `insert into public.part_compatibility (part_id, product_id) select (select id from public.products where ref = ${q(p.ref)}), (select id from public.products where ref = ${q(r)});\n`;
  }
  sql += "\n";
}
const file = "supabase/migrations/20261031190000_datos_ejemplo.sql";
writeFileSync(file, sql);
console.log(file, sql.length);
