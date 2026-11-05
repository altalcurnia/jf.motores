import { describe, expect, it } from "vitest";
import { hasLocale, matchLocale, switchLocalePath } from "@/i18n/config";
import es from "@/i18n/dictionaries/es.json";
import en from "@/i18n/dictionaries/en.json";
import pt from "@/i18n/dictionaries/pt.json";

function keys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("idiomas", () => {
  it("reconoce solo los idiomas soportados", () => {
    expect(hasLocale("es")).toBe(true);
    expect(hasLocale("pt")).toBe(true);
    expect(hasLocale("fr")).toBe(false);
    expect(hasLocale(undefined)).toBe(false);
  });

  it("elige el idioma del navegador por prioridad", () => {
    expect(matchLocale("pt-BR,pt;q=0.9,en;q=0.8")).toBe("pt");
    expect(matchLocale("fr-FR,en;q=0.5")).toBe("en");
    expect(matchLocale("de-DE")).toBe("es");
    expect(matchLocale(null)).toBe("es");
  });

  it("cambia el prefijo de idioma conservando la ruta", () => {
    expect(switchLocalePath("/es/motores", "en")).toBe("/en/motores");
    expect(switchLocalePath("/es", "pt")).toBe("/pt");
    expect(switchLocalePath("/", "en")).toBe("/en");
  });

  it("los tres diccionarios tienen exactamente las mismas claves", () => {
    const base = keys(es).sort();
    expect(keys(en).sort()).toEqual(base);
    expect(keys(pt).sort()).toEqual(base);
  });
});
