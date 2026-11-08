import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { DEFAULT_FROM, DEFAULT_REPLY_TO, sendEmail } from "@/lib/email";

describe("sendEmail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("envía desde el dominio de JF Motores y las respuestas van al Gmail de la empresa", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "abc" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await sendEmail({ to: "cliente@ejemplo.com", subject: "Hola", html: "<p>Hola</p>", text: "Hola" });
    expect(r).toEqual({ ok: true, id: "abc" });
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.from).toBe(DEFAULT_FROM);
    expect(body.from).toContain("@jfmotoresmedellin.com");
    expect(body.reply_to).toBe(DEFAULT_REPLY_TO);
    expect(body.to).toEqual(["cliente@ejemplo.com"]);
  });

  it("sin clave de Resend no envía nada", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const r = await sendEmail({ to: "a@b.co", subject: "x", html: "x", text: "x" });
    expect(r).toEqual({ ok: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
