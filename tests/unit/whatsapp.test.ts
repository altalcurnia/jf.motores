import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl, normalizePhone } from "@/features/whatsapp/link";

describe("enlace de WhatsApp", () => {
  it("normaliza números con signos y espacios", () => {
    expect(normalizePhone("+57 312 211 0262")).toBe("573122110262");
  });

  it("rechaza números inválidos", () => {
    expect(() => normalizePhone("123")).toThrow();
  });

  it("codifica el mensaje", () => {
    expect(buildWhatsAppUrl("573122110262", "Hola, REF JF-M25 & más")).toBe(
      "https://wa.me/573122110262?text=Hola%2C%20REF%20JF-M25%20%26%20m%C3%A1s",
    );
  });

  it("omite el texto si está vacío", () => {
    expect(buildWhatsAppUrl("573122110262", "  ")).toBe("https://wa.me/573122110262");
  });
});
