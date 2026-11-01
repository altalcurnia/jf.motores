import { describe, expect, it } from "vitest";
import { waLead } from "@/features/whatsapp/lead-link";

describe("enlace de WhatsApp con registro del lead", () => {
  it("arma /api/wa con mensaje, fuente, idioma y producto", () => {
    const href = waLead({ message: "Hola, REF JF-M25 & más", source: "ficha", locale: "es", productId: "8f31e07c-d73a-49d6-b43d-6b84732cd31e", catalog: "motobomba" });
    expect(href.startsWith("/api/wa?")).toBe(true);
    const q = new URLSearchParams(href.split("?")[1]);
    expect(q.get("m")).toBe("Hola, REF JF-M25 & más");
    expect(q.get("s")).toBe("ficha");
    expect(q.get("l")).toBe("es");
    expect(q.get("p")).toBe("8f31e07c-d73a-49d6-b43d-6b84732cd31e");
    expect(q.get("c")).toBe("motobomba");
  });

  it("recorta mensajes muy largos y omite lo que no se pasa", () => {
    const q = new URLSearchParams(waLead({ message: "x".repeat(2000), source: "cabecera" }).split("?")[1]);
    expect(q.get("m")!.length).toBe(700);
    expect(q.has("p")).toBe(false);
    expect(q.has("l")).toBe(false);
  });
});
