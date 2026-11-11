import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { isFirstConfirmation, welcomeEmail } from "@/features/account/welcome-email";

describe("correo de bienvenida", () => {
  it("se arma en el idioma del cliente con enlaces al dominio del sitio", () => {
    const m = welcomeEmail({ locale: "es", siteUrl: "https://jfmotoresmedellin.com/" });
    expect(m.subject).toBe("Tu cuenta de JF Motores está lista");
    expect(m.html).toContain("https://jfmotoresmedellin.com/es/cuenta");
    expect(m.html).toContain("https://jfmotoresmedellin.com/logo.png");
    expect(m.text).toContain("https://jfmotoresmedellin.com/es/catalogo");
    expect(welcomeEmail({ locale: "en", siteUrl: "https://x.co" }).subject).toBe("Your JF Motores account is ready");
  });

  it("solo se envía en la primera confirmación, no con un enlace de acceso de una cuenta vieja", () => {
    const now = Date.parse("2026-11-08T06:00:00Z");
    expect(isFirstConfirmation("2026-11-08T05:59:30Z", now)).toBe(true);
    expect(isFirstConfirmation("2026-10-01T10:00:00Z", now)).toBe(false);
    expect(isFirstConfirmation(null, now)).toBe(false);
  });
});
