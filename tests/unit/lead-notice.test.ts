import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/features/telegram/settings", () => ({ getTelegramSettings: vi.fn() }));
vi.mock("@/lib/site", () => ({ site: { url: "https://jfmotoresmedellin.com" } }));

import { leadNoticeText } from "@/features/leads/notify";
import { parseChatIds } from "@/features/telegram/api";

describe("aviso de lead al equipo", () => {
  it("resume el lead sin datos personales y enlaza al panel", () => {
    const text = leadNoticeText({
      code: "COT-1",
      source: "ficha",
      message: "Hola, me interesa la REF JF-M25\nPrecio: $10.000.000",
      country: "CO",
      device: "mobile",
      campaign: "motobombas-nov",
    });
    expect(text).toContain("COT-1");
    expect(text).toContain("«Hola, me interesa la REF JF-M25»");
    expect(text).toContain("Desde: ficha · CO · mobile");
    expect(text).toContain("Campaña: motobombas-nov");
    expect(text).toContain("https://jfmotoresmedellin.com/admin/leads");
  });

  it("lee los IDs de chat escritos en el panel", () => {
    expect(parseChatIds("12345, -1001234567890\n12345  abc 99")).toEqual(["12345", "-1001234567890"]);
  });
});
