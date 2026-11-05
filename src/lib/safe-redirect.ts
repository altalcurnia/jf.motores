/** Solo permite redirigir a rutas internas del sitio (evita redirecciones abiertas a otros dominios). */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n]/.test(next)) {
    return fallback;
  }
  return next;
}

/** Igual que safeNextPath, pero solo dentro del panel. */
export function safeAdminPath(next: string | null | undefined): string {
  const path = safeNextPath(next, "/admin");
  return path.startsWith("/admin") ? path : "/admin";
}
