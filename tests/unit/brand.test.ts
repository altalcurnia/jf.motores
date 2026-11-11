import { describe, expect, it } from "vitest";
import es from "@/i18n/dictionaries/es.json";
import en from "@/i18n/dictionaries/en.json";
import pt from "@/i18n/dictionaries/pt.json";
import nes from "@/i18n/brand/nueva.es.json";
import nen from "@/i18n/brand/nueva.en.json";
import npt from "@/i18n/brand/nueva.pt.json";
import { brandVersions, isBrand, DEFAULT_BRAND } from "@/features/brand/brands";

/** Cada clave del ajuste de marca debe existir en el diccionario base (si no, el texto no se usaría). */
function missing(over: unknown, base: unknown, path = ""): string[] {
  if (!over || typeof over !== "object" || Array.isArray(over)) return [];
  return Object.entries(over as Record<string, unknown>).flatMap(([k, v]) =>
    base && typeof base === "object" && k in (base as object)
      ? missing(v, (base as Record<string, unknown>)[k], `${path}.${k}`)
      : [`${path}.${k}`],
  );
}

describe("versiones de marca", () => {
  it("los textos nuevos solo ajustan claves que existen", () => {
    expect(missing(nes, es)).toEqual([]);
    expect(missing(nen, en)).toEqual([]);
    expect(missing(npt, pt)).toEqual([]);
  });
  it("los tres idiomas ajustan las mismas claves", () => {
    const keys = (o: object): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keys(v).map((x) => `${k}.${x}`) : [k]));
    expect(keys(nen).sort()).toEqual(keys(nes).sort());
    expect(keys(npt).sort()).toEqual(keys(nes).sort());
  });
  it("hay tres versiones y la predeterminada existe", () => {
    expect(brandVersions.map((b) => b.key)).toEqual(["nueva", "roja", "clasica"]);
    expect(isBrand(DEFAULT_BRAND)).toBe(true);
    expect(isBrand("otra")).toBe(false);
  });
});
