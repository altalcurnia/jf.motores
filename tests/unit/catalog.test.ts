import { describe, expect, it } from "vitest";
import { fill, filterProducts, parseCatalogQuery, specValue, storageUrl, tr, type CatalogProduct } from "@/features/catalog/shared";

const base: Omit<CatalogProduct, "id" | "ref" | "slug" | "name" | "priceCop" | "status" | "publishedAt" | "specs"> = {
  catalog: "motobomba", condition: "nuevo", summary: {}, description: {}, featured: false, categoryId: "c1", engineModelId: null, images: [], glbPath: null,
};
const mk = (id: string, o: Partial<CatalogProduct>): CatalogProduct =>
  ({ ...base, id, ref: id.toUpperCase(), slug: id, name: { es: `Bomba ${id}` }, priceCop: 100, status: "disponible", publishedAt: "2026-01-01", specs: {}, ...o }) as CatalogProduct;

const products = [
  mk("a", { priceCop: 300, publishedAt: "2026-03-01", specs: { hp: 25 } }),
  mk("b", { priceCop: null, publishedAt: "2026-05-01", status: "vendido", specs: { hp: 40 } }),
  mk("c", { priceCop: 100, publishedAt: "2026-04-01", categoryId: "c2", name: { es: "Motobomba Montaña" } }),
];
const ctx = { locale: "es" as const, categories: [{ id: "c2", catalog: "motobomba" as const, slug: "otra", name: {}, partKey: null, sort: 0 }], compat: [{ partId: "a", engineModelId: "m1", productId: null }] };
const ids = (q: Record<string, string>) => filterProducts(products, parseCatalogQuery(q), ctx).map((p) => p.id);

describe("catálogo", () => {
  it("ordena por fecha de publicación por defecto", () => expect(ids({})).toEqual(["b", "c", "a"]));
  it("filtra por estado", () => expect(ids({ estado: "vendido" })).toEqual(["b"]));
  it("ignora valores inválidos en la URL", () => expect(parseCatalogQuery({ estado: "x", orden: "y" })).toMatchObject({ status: "all", sort: "new" }));
  it("precio sin valor va al final en ambos sentidos", () => {
    expect(ids({ orden: "price-asc" })).toEqual(["c", "a", "b"]);
    expect(ids({ orden: "price-desc" })).toEqual(["a", "c", "b"]);
  });
  it("busca sin tildes ni mayúsculas y por categoría o motor compatible", () => {
    expect(ids({ q: "montana" })).toEqual(["c"]);
    expect(ids({ categoria: "otra" })).toEqual(["c"]);
    expect(ids({ motor: "m1" })).toEqual(["a"]);
  });
  it("arma URLs de imágenes", () => {
    expect(storageUrl("/demo/x.jpg", "https://p.supabase.co")).toBe("/demo/x.jpg");
    expect(storageUrl("productos/a.jpg", "https://p.supabase.co/")).toBe("https://p.supabase.co/storage/v1/object/public/catalogo/productos/a.jpg");
  });
  it("traduce con respaldo en español, rellena textos y formatea especificaciones", () => {
    expect(tr({ es: "Hola" }, "pt")).toBe("Hola");
    expect(fill("{n} resultados", { n: 3 })).toBe("3 resultados");
    expect(specValue("caudal_lpm", 4000, "en")).toBe("4,000 L/min");
  });
});

describe("repuestos compatibles con un equipo", () => {
  const parts = [mk("p1", { catalog: "repuesto" }), mk("p2", { catalog: "repuesto" }), mk("p3", { catalog: "repuesto" })];
  const compat = [
    { partId: "p1", engineModelId: "motorA", productId: null },
    { partId: "p2", engineModelId: null, productId: "11111111-1111-1111-1111-111111111111" },
    { partId: "p3", engineModelId: "motorB", productId: null },
  ];
  it("incluye los del motor del equipo y los del equipo mismo", () => {
    const q = parseCatalogQuery({ equipo: "11111111-1111-1111-1111-111111111111" });
    const ids = filterProducts(parts, q, { locale: "es", categories: [], compat, equipmentEngine: "motorA" }).map((p) => p.id);
    expect(ids.sort()).toEqual(["p1", "p2"]);
  });
  it("ignora un id de equipo inválido", () => expect(parseCatalogQuery({ equipo: "x" }).equipment).toBeNull());
});

describe("título de la ficha para Google", () => {
  it("no repite la referencia si ya está en el nombre y agrega potencia y succión", async () => {
    const { productSeoTitle } = await import("@/features/catalog/shared");
    expect(productSeoTitle("Motobomba Cummins 4BT", "CUMMINS 4BT", { hp: 120, succion_in: 4 })).toBe('Motobomba Cummins 4BT · 120 HP · 4"');
    expect(productSeoTitle("Motobomba JF diésel", "JF-M25", {})).toBe("Motobomba JF diésel · JF-M25");
  });
});

describe("descripción de la ficha para Google", () => {
  const labels = { hp: "Potencia", caudal_lpm: "Caudal máximo", cabeza_m: "Cabeza máxima", solidos_mm: "Paso de sólidos", succion_in: "Succión" };
  const cta = "Cotiza por WhatsApp.";

  it("si el resumen es corto, la arma con el nombre y las especificaciones de la ficha", async () => {
    const { productSeoDescription } = await import("@/features/catalog/shared");
    const d = productSeoDescription({
      name: "Motobomba JF Jaguar 25",
      summary: "Minera · tajo abierto",
      description: "",
      specs: { hp: 25, caudal_lpm: 3000, cabeza_m: 30, solidos_mm: 50, succion_in: 6 },
      labels,
      cta,
      locale: "es",
    });
    expect(d.startsWith("Motobomba JF Jaguar 25: Minera · tajo abierto. Potencia 25 HP, caudal máximo")).toBe(true);
    expect(d).toContain("cabeza máxima 30 m");
    expect(d.endsWith(cta)).toBe(true);
    expect(d.length).toBeLessThanOrEqual(160);
  });

  it("respeta un resumen completo y no inventa datos cuando no hay especificaciones", async () => {
    const { productSeoDescription } = await import("@/features/catalog/shared");
    const long = "Motobomba diésel lista para trabajar en tajo abierto, con motor de 25 HP y bomba de 6 pulgadas probada en taller.";
    expect(productSeoDescription({ name: "X", summary: long, description: "", specs: { hp: 25 }, labels, cta, locale: "es" })).toBe(long);
    expect(productSeoDescription({ name: "X", summary: "Corto", description: "Texto largo", specs: {}, labels, cta, locale: "es" })).toBe("Corto");
    expect(productSeoDescription({ name: "X", summary: "", description: "Texto de la ficha", specs: {}, labels, cta, locale: "es" })).toBe("Texto de la ficha");
  });
});

describe("piezas del despiece con repuestos", () => {
  it("solo cuenta las piezas cuya categoría tiene al menos un producto", async () => {
    const { partKeysWithProducts } = await import("@/features/catalog/shared");
    const categories = [
      { id: "c1", partKey: "radiador" },
      { id: "c2", partKey: "ciguenal" },
      { id: "c3", partKey: null },
    ];
    const withProducts = partKeysWithProducts(categories, [{ categoryId: "c1" }, { categoryId: "c3" }, { categoryId: null }]);
    expect([...withProducts]).toEqual(["radiador"]);
  });
});

describe("condición del producto", () => {
  it("filtra por nuevo, usado o reconstruido e ignora valores desconocidos en la URL", () => {
    const list = [mk("n", { condition: "nuevo" }), mk("u", { condition: "usado" }), mk("r", { condition: "reconstruido" })];
    const ctx = { locale: "es" as const, categories: [], compat: [] };
    expect(filterProducts(list, parseCatalogQuery({ condicion: "reconstruido" }), ctx).map((p) => p.id)).toEqual(["r"]);
    expect(filterProducts(list, parseCatalogQuery({ condicion: "usado" }), ctx).map((p) => p.id)).toEqual(["u"]);
    expect(parseCatalogQuery({ condicion: "roto" }).condition).toBeNull();
    expect(filterProducts(list, parseCatalogQuery({ condicion: "roto" }), ctx)).toHaveLength(3);
  });

  it("le dice a Google la condición real", async () => {
    const { conditionSchema } = await import("@/features/catalog/shared");
    expect(conditionSchema.nuevo).toBe("https://schema.org/NewCondition");
    expect(conditionSchema.usado).toBe("https://schema.org/UsedCondition");
    expect(conditionSchema.reconstruido).toBe("https://schema.org/RefurbishedCondition");
  });
});
