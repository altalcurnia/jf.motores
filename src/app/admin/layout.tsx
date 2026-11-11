import type { Metadata } from "next";
import "@fontsource/archivo/900.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/jetbrains-mono/400.css";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Panel · JF Motores", template: "%s · Panel JF Motores" },
  robots: { index: false, follow: false },
};

/** Raíz independiente del panel (en español, sin el motor 3D ni la navegación pública). */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="es-CO">
      <body className="admin">{children}</body>
    </html>
  );
}
