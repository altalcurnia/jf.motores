import { describe, expect, it } from "vitest";
import { countryFromRequest, resolveDestination, visitorLocale } from "@/lib/auth-routing";

describe("a dónde va cada quien después de entrar", () => {
  it("un cliente nunca termina en el panel", () => {
    expect(resolveDestination({ requested: "/admin", isStaff: false, locale: "es" })).toBe("/es/cuenta");
    expect(resolveDestination({ requested: "/admin/productos", isStaff: false, locale: "pt" })).toBe("/pt/cuenta");
    expect(resolveDestination({ requested: null, isStaff: false, locale: "en" })).toBe("/en/cuenta");
  });
  it("el cliente vuelve a la página del sitio que pidió", () => {
    expect(resolveDestination({ requested: "/es/motobombas", isStaff: false, locale: "es" })).toBe("/es/motobombas");
  });
  it("el personal interno va al panel o a lo que pidió", () => {
    expect(resolveDestination({ requested: null, isStaff: true, locale: "es" })).toBe("/admin");
    expect(resolveDestination({ requested: "/admin/productos", isStaff: true, locale: "es" })).toBe("/admin/productos");
    expect(resolveDestination({ requested: "/es/cuenta", isStaff: true, locale: "es" })).toBe("/es/cuenta");
  });
  it("ignora destinos externos", () => {
    expect(resolveDestination({ requested: "https://malo.com", isStaff: false, locale: "es" })).toBe("/es/cuenta");
  });
  it("detecta el idioma por ruta, cookie o navegador", () => {
    expect(visitorLocale(undefined, "pt-BR", "/en/cuenta")).toBe("en");
    expect(visitorLocale("pt", "en-US", null)).toBe("pt");
    expect(visitorLocale(undefined, "en-US,en;q=0.9", null)).toBe("en");
  });
});

describe("countryFromRequest", () => {
  const req = (v?: string) => ({ headers: new Headers(v === undefined ? {} : { "x-vercel-ip-country": v }) });
  it("lee el país de la conexión", () => expect(countryFromRequest(req("co"))).toBe("CO"));
  it("ignora valores vacíos o inválidos", () => {
    expect(countryFromRequest(req())).toBeNull();
    expect(countryFromRequest(req("XX"))).toBeNull();
    expect(countryFromRequest(req("Colombia"))).toBeNull();
  });
});
