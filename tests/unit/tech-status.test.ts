import { describe, expect, it } from "vitest";
import { SERVICES, ciStatus, deepseekStatus } from "@/app/admin/tecnologias/services";

describe("estado de las plataformas (admin → Tecnologías)", () => {
  it("saldo de DeepSeek: bien, bajo o sin saldo", () => {
    expect(deepseekStatus({ is_available: true, balance_infos: [{ currency: "USD", total_balance: "8.40" }] }).level).toBe("ok");
    expect(deepseekStatus({ is_available: true, balance_infos: [{ currency: "USD", total_balance: "1.10" }] }).level).toBe("warn");
    expect(deepseekStatus({ is_available: false, balance_infos: [{ currency: "USD", total_balance: "0.00" }] }).level).toBe("error");
    expect(deepseekStatus(null).level).toBe("error");
  });

  it("pruebas de GitHub: verde, fallidas o en curso", () => {
    const base = { head_sha: "abcdef1234", created_at: "2026-11-08T07:00:00Z" };
    expect(ciStatus({ ...base, status: "completed", conclusion: "success" }).level).toBe("ok");
    expect(ciStatus({ ...base, status: "completed", conclusion: "failure" }).level).toBe("error");
    expect(ciStatus({ ...base, status: "in_progress", conclusion: null }).level).toBe("info");
    expect(ciStatus(null).level).toBe("info");
  });

  it("cada plataforma tiene descripción y al menos un enlace", () => {
    expect(new Set(SERVICES.map((s) => s.key)).size).toBe(SERVICES.length);
    for (const s of SERVICES) {
      expect(s.what.length).toBeGreaterThan(20);
      expect(s.links.length).toBeGreaterThan(0);
    }
  });
});
