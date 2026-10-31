/** Solo permite redirigir a rutas internas del panel (evita redirecciones abiertas). */
export function safeAdminPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/admin") || next.startsWith("//") || next.includes("\\")) return "/admin";
  return next;
}
