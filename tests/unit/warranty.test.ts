import { describe, expect, it } from "vitest";
import { warrantyState } from "@/features/account/warranty";

describe("garantía", () => {
  it("sin fechas no hay garantía", () => expect(warrantyState(null, null).kind).toBe("none"));
  it("vigente con días restantes", () => {
    const w = warrantyState("2026-11-01", "2027-10-31", "2026-11-11");
    expect(w).toMatchObject({ kind: "active", daysLeft: 354 });
  });
  it("el último día todavía está vigente y el siguiente ya vence", () => {
    expect(warrantyState("2026-01-01", "2026-06-30", "2026-06-30").kind).toBe("active");
    expect(warrantyState("2026-01-01", "2026-06-30", "2026-07-01").kind).toBe("expired");
  });
});
