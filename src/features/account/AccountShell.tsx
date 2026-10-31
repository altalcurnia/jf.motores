import type { ReactNode } from "react";

/** Marco común de las páginas de cuenta (entrar, registro, recuperar). */
export function AccountShell({
  kicker,
  title,
  subtitle,
  aside,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="block acc-page">
      <div className="acc-grid">
        <div className="acc-intro">
          <div className="sk">{kicker}</div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
          {aside}
        </div>
        <div className="acc-card">{children}</div>
      </div>
    </section>
  );
}
