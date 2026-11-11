/**
 * ¿El clic a /api/wa lo hizo una persona?
 *
 * Los navegadores actuales (también los de Instagram, Facebook y TikTok) envían `Sec-Fetch-User: ?1`
 * solo cuando la navegación nace de un toque o clic real. Los robots que abren el enlace por su cuenta
 * no lo envían. En navegadores antiguos sin encabezados `Sec-Fetch-*` se exige que el clic venga de
 * nuestra propia página (`Referer`). Si no es una persona, igual se redirige a WhatsApp, pero sin
 * registrar el lead, para que la métrica de campañas no se llene de robots.
 */
export function isHumanClick(headers: Headers, host: string): boolean {
  const purpose = `${headers.get("sec-purpose") ?? ""} ${headers.get("purpose") ?? ""}`;
  if (/prefetch|prerender/i.test(purpose) || headers.has("next-router-prefetch")) return false;

  const mode = headers.get("sec-fetch-mode");
  if (mode) return mode === "navigate" && headers.get("sec-fetch-user") === "?1";

  const referer = headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).host === host;
  } catch {
    return false;
  }
}
