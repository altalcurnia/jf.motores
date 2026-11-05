import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { purchaseEmail } = await import("@/features/sales/purchase-email");

const base = {
  name: "Alexis <b>Zapata</b>",
  product: "Motobomba JF-M25",
  ref: "JF-M25",
  serial: "JF-M25-0042",
  soldOn: "2026-10-30",
  accountUrl: "https://jfmotores.altalcurnia.com/es/cuenta",
  manualUrl: "https://jfmotores.altalcurnia.com/api/manual/abc",
  whatsappUrl: "https://wa.me/573122110262",
};

describe("correo de compra", () => {
  it("en español, con serie, fecha y guía, sin HTML inyectado", () => {
    const m = purchaseEmail({ ...base, locale: "es" });
    expect(m.subject).toBe("Tu compra quedó registrada: Motobomba JF-M25");
    expect(m.html).toContain("JF-M25-0042");
    expect(m.html).toContain("30 de octubre de 2026");
    expect(m.html).toContain("/api/manual/abc");
    expect(m.html).not.toContain("<b>Zapata");
    expect(m.text).toContain("no es una factura");
  });
  it("en portugués y sin guía", () => {
    const m = purchaseEmail({ ...base, locale: "pt", manualUrl: null });
    expect(m.subject).toContain("Sua compra foi registrada");
    expect(m.html).not.toContain("/api/manual/");
  });
});
