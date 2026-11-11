import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { localeTags } from "@/i18n/config";
import { getTrust } from "@/lib/supabase/public";

/**
 * Prueba social del inicio: años en el mercado, cifras y testimonios con permiso.
 * Solo se muestra lo que el panel tiene lleno; si no hay nada, no aparece la sección.
 */
export async function TrustSection({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const trust = await getTrust();
  const t = dict.trust;
  const num = new Intl.NumberFormat(localeTags[locale]);
  const figures = [
    trust.years ? { n: trust.years, label: t.years } : null,
    trust.stats.equipos ? { n: trust.stats.equipos, label: t.equipos } : null,
    trust.stats.clientes ? { n: trust.stats.clientes, label: t.clientes } : null,
    trust.stats.municipios ? { n: trust.stats.municipios, label: t.municipios } : null,
  ].filter((x): x is { n: number; label: string } => !!x);
  if (!figures.length && !trust.testimonials.length) return null;

  return (
    <section className="block trust" id="confianza">
      <div className="sk reveal">{t.kicker}</div>
      {figures.length > 0 && (
        <div className="trust-figures reveal">
          {figures.map((f) => (
            <div key={f.label}>
              <b>{num.format(f.n)}+</b>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      )}
      {trust.testimonials.length > 0 && (
        <>
          <h2 className="reveal">{t.title}</h2>
          <div className="trust-quotes">
            {trust.testimonials.map((q) => (
              <figure key={q.id} className="trust-quote reveal">
                <blockquote>“{q.quote}”</blockquote>
                <figcaption>
                  <b>{q.name}</b>
                  {(q.place || q.product) && <span>{[q.place, q.product].filter(Boolean).join(" · ")}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
