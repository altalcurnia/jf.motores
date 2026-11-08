import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const rpc = vi.fn();
  const createSupabaseServerClient = vi.fn(() => Promise.resolve({ rpc }));
  const getContact = vi.fn(() => Promise.resolve({ whatsapp: "573001112233" }));
  return { rpc, createSupabaseServerClient, getContact };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("@/lib/supabase/public", () => ({
  getContact: mocks.getContact,
}));

import { GET } from "@/app/api/wa/route";

/** Toque real de una persona en un navegador actual (encabezados Sec-Fetch de navegación). */
const HUMAN = { "sec-fetch-mode": "navigate", "sec-fetch-user": "?1", "sec-fetch-site": "same-origin" };

function request(userAgent: string, extra: Record<string, string> = HUMAN) {
  return new NextRequest(
    "https://jfmotores.altalcurnia.com/api/wa?m=Hola%20REF%20JF-M25&s=ficha&l=es&c=motobomba",
    { headers: { "user-agent": userAgent, "x-forwarded-for": "203.0.113.10", ...extra } },
  );
}

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile";

describe("GET /api/wa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VERCEL_ENV", "production");
    mocks.rpc.mockResolvedValue({
      data: { phone: "573111222333", code: "COT-2026-001" },
      error: null,
    });
  });

  it("registra mediante el cliente simulado, redirige y crea la cookie de visitante", async () => {
    const response = await GET(request("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile"));

    expect(response.status).toBe(302);
    const destination = new URL(response.headers.get("location")!);
    expect(destination.origin).toBe("https://wa.me");
    expect(destination.pathname).toBe("/573111222333");
    expect(destination.searchParams.get("text")).toBe("Hola REF JF-M25\n\nCódigo de cotización: COT-2026-001");
    expect(response.cookies.get("jf_vid")?.value).toMatch(/^[0-9a-f-]{36}$/i);
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "lead_create",
      expect.objectContaining({
        p_catalog: "motobomba",
        p_source: "ficha",
        p_locale: "es",
        p_device: "mobile",
        p_user_agent: expect.stringContaining("iPhone"),
      }),
    );
  });

  it("omite el registro para bots y redirige a la línea principal sin cookie", async () => {
    const response = await GET(request("facebookexternalhit/1.1"));

    expect(response.status).toBe(302);
    const destination = new URL(response.headers.get("location")!);
    expect(destination.pathname).toBe("/573001112233");
    expect(destination.searchParams.get("text")).toBe("Hola REF JF-M25");
    expect(response.cookies.get("jf_vid")).toBeUndefined();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it.each([
    ["sin encabezados ni página de origen (robot con user-agent de iPhone)", {}],
    ["navegación automática sin toque del usuario", { "sec-fetch-mode": "navigate", "sec-fetch-site": "none" }],
    ["precarga del navegador", { ...HUMAN, "sec-purpose": "prefetch" }],
    ["navegador antiguo desde otra página", { referer: "https://otro-sitio.com/" }],
  ])("no registra el lead: %s, pero igual abre WhatsApp", async (_name, extra) => {
    const response = await GET(request(IPHONE, extra));

    expect(response.status).toBe(302);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/573001112233");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("fuera de producción (local, CI, vistas previas) no registra leads", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const response = await GET(request(IPHONE));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/573001112233");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("registra el lead de un navegador antiguo si el clic viene de nuestra página", async () => {
    const response = await GET(request(IPHONE, { referer: "https://jfmotores.altalcurnia.com/es/motobombas" }));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/573111222333");
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });

  it("mantiene la redirección a WhatsApp si falla el RPC", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "RPC unavailable" } });

    try {
      const response = await GET(request("Mozilla/5.0 Chrome/130.0.0.0"));

      expect(response.status).toBe(302);
      const destination = new URL(response.headers.get("location")!);
      expect(destination.pathname).toBe("/573001112233");
      expect(destination.searchParams.get("text")).toBe("Hola REF JF-M25");
      expect(response.cookies.get("jf_vid")?.value).toMatch(/^[0-9a-f-]{36}$/i);
      expect(mocks.rpc).toHaveBeenCalledOnce();
    } finally {
      logError.mockRestore();
    }
  });
});
