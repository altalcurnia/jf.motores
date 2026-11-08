import { describe, expect, it } from "vitest";
import { parseAnalytics, validateAnalytics } from "@/features/analytics/ids";

describe("IDs de medición de anuncios", () => {
  it("acepta y limpia los formatos de cada red", () => {
    const r = validateAnalytics({ ga4: " g-abc123xyz ", pixel: "1234 5678 9012", gads: "aw-123456789", gadsLabel: "AbC-D_efG", tiktok: "c4abc123def456" });
    expect(r).toEqual({
      ok: true,
      value: { ga4: "G-ABC123XYZ", pixel: "123456789012", gads: "AW-123456789", gadsLabel: "AbC-D_efG", tiktok: "C4ABC123DEF456" },
    });
  });

  it("rechaza formatos inválidos con un mensaje claro", () => {
    expect(validateAnalytics({ gads: "123456789" })).toMatchObject({ ok: false, error: expect.stringContaining("AW-") });
    expect(validateAnalytics({ tiktok: "abc" })).toMatchObject({ ok: false, error: expect.stringContaining("TikTok") });
    expect(validateAnalytics({ gadsLabel: "AbC-D_efG" })).toMatchObject({ ok: false, error: expect.stringContaining("falta el ID") });
  });

  it("campos vacíos = esa red no se carga", () => {
    expect(validateAnalytics({ ga4: "", pixel: "" })).toEqual({ ok: true, value: {} });
    expect(parseAnalytics({})).toEqual({ ga4: null, pixel: null, gads: null, gadsLabel: null, tiktok: null });
  });

  it("descarta lo guardado con formato inválido y la etiqueta sin ID de Google Ads", () => {
    expect(parseAnalytics({ ga4: "<script>", pixel: "123456", gadsLabel: "AbC-D_efG" })).toEqual({
      ga4: null,
      pixel: "123456",
      gads: null,
      gadsLabel: null,
      tiktok: null,
    });
  });
});
