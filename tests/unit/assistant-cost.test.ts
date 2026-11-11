import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { usageCost } = await import("@/features/assistant/deepseek");

describe("costo de cada respuesta", () => {
  it("usa los tokens en caché, sin caché y de salida con las tarifas de deepseek-flash", () => {
    const c = usageCost("deepseek-flash", {
      prompt_tokens: 12_000,
      prompt_cache_hit_tokens: 11_000,
      prompt_cache_miss_tokens: 1_000,
      completion_tokens: 400,
    });
    // 11 000 × 0,006 + 1 000 × 0,30 + 400 × 1,20 (por millón)
    expect(c.cost).toBeCloseTo((11_000 * 0.006 + 1_000 * 0.3 + 400 * 1.2) / 1e6, 10);
    expect(c.tin).toBe(12_000);
    expect(c.tout).toBe(400);
  });

  it("sin datos de caché cuenta todo como no cacheado, y un modelo desconocido con la tarifa más alta", () => {
    expect(usageCost("deepseek-flash", { prompt_tokens: 1000, completion_tokens: 0 }).cost).toBeCloseTo(0.0003, 10);
    expect(usageCost("otro", { prompt_tokens: 1000, completion_tokens: 0 }).cost).toBeCloseTo(0.00132, 10);
  });
});
