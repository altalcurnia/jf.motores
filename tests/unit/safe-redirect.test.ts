import { describe, expect, it } from "vitest";
import { safeAdminPath, safeNextPath } from "@/lib/safe-redirect";

describe("redirecciones seguras después de entrar", () => {
  it("acepta rutas internas", () => {
    expect(safeNextPath("/es/cuenta")).toBe("/es/cuenta");
    expect(safeAdminPath("/admin/productos")).toBe("/admin/productos");
  });
  it("rechaza dominios externos y trucos comunes", () => {
    for (const bad of ["https://malo.com", "//malo.com", "/\\malo.com", "javascript:alert(1)", "/es\r\nSet-Cookie:x"]) {
      expect(safeNextPath(bad, "/x")).toBe("/x");
    }
  });
  it("el panel solo redirige dentro de /admin", () => {
    expect(safeAdminPath("/es/cuenta")).toBe("/admin");
    expect(safeAdminPath(null)).toBe("/admin");
  });
});
