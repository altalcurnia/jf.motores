"use client";
import { useState, useSyncExternalStore } from "react";
import { EmailChooser, type MailLabels } from "@/components/EmailChooser";

const EVENT = "branchtab";

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export type BranchAdvisorView = {
  id: string;
  name: string;
  initials: string;
  title: string;
  photoUrl: string | null;
  phone: string;
  phoneFormatted: string;
  email: string | null;
  waHref: string;
};

export type BranchView = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  phoneFormatted: string | null;
  hours: string;
  description: string;
  mapQuery: string;
  mapTitle: string;
  advisorsTitle: string;
  photos: string[];
  generalWaHref: string;
  advisors: BranchAdvisorView[];
};

export type BranchLabels = {
  title: string;
  intro: string;
  address: string;
  phone: string;
  hours: string;
  directions: string;
  openMaps: string;
  photos: string;
  noPhotos: string;
  advisors: string;
  noAdvisors: string;
  whatsapp: string;
  call: string;
  email: string;
  waMessage: string;
  mapTitle: string;
};

function PhotoGallery({ photos, name, noPhotos }: { photos: string[]; name: string; noPhotos: string }) {
  const [idx, setIdx] = useState(0);
  if (!photos.length) return <p className="branch-empty">{noPhotos}</p>;
  const safeIdx = idx < photos.length ? idx : 0;
  return (
    <div className="branch-gallery">
      <div className="branch-photo-main">
        {/* eslint-disable-next-line @next/next/no-img-element -- fotos subidas al bucket sedes */}
        <img src={photos[safeIdx]} alt={`${name} — ${safeIdx + 1}`} loading="lazy" />
      </div>
      {photos.length > 1 && (
        <div className="branch-photo-thumbs" role="list">
          {photos.map((url, i) => (
            <button
              key={url}
              type="button"
              className={`branch-thumb${i === safeIdx ? " on" : ""}`}
              aria-label={`${name} ${i + 1}`}
              aria-pressed={i === safeIdx}
              onClick={() => setIdx(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de la sede */}
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Subpestañas por sede sincronizadas con el #ancla de la URL (/es/sedes#caucasia).
 * Por defecto muestra la primera sede.
 */
export function BranchTabs({
  branches,
  labels,
  mail,
}: {
  branches: BranchView[];
  labels: BranchLabels;
  mail: MailLabels;
}) {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash.slice(1).toLowerCase(),
    () => "",
  );
  const activeSlug = branches.some((b) => b.slug === hash) ? hash : (branches[0]?.slug ?? "");

  function pick(slug: string) {
    history.replaceState(null, "", `#${slug}`);
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <>
      <div className="guide-subtabs branch-tabs" role="tablist">
        {branches.map((b) => (
          <button
            key={b.slug}
            type="button"
            role="tab"
            aria-selected={activeSlug === b.slug}
            className={activeSlug === b.slug ? "on" : ""}
            onClick={() => pick(b.slug)}
          >
            {b.name}
          </button>
        ))}
      </div>

      {branches.map((b) => {
        const q = encodeURIComponent(b.mapQuery);
        return (
          <div key={b.id} id={b.slug} role="tabpanel" hidden={activeSlug !== b.slug} className="branch-panel">
            <div className="branch-top">
              <div className="branch-info">
                <h2>{b.name}</h2>
                {b.description && <p className="branch-desc">{b.description}</p>}
                <dl className="branch-meta">
                  {b.address && (
                    <div>
                      <dt>{labels.address}</dt>
                      <dd>
                        {b.address} · {b.city}
                      </dd>
                    </div>
                  )}
                  {b.phone && b.phoneFormatted && (
                    <div>
                      <dt>{labels.phone}</dt>
                      <dd>
                        <a href={`tel:+${b.phone.replace(/\D/g, "")}`}>{b.phoneFormatted}</a>
                      </dd>
                    </div>
                  )}
                  {b.hours && (
                    <div>
                      <dt>{labels.hours}</dt>
                      <dd>{b.hours}</dd>
                    </div>
                  )}
                </dl>
                <div className="branch-map-actions">
                  <a
                    className="btn y"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${q}`}
                    target="_blank"
                    rel="noopener"
                  >
                    {labels.directions}
                  </a>
                  <a
                    className="btn"
                    href={`https://www.google.com/maps/search/?api=1&query=${q}`}
                    target="_blank"
                    rel="noopener"
                  >
                    {labels.openMaps}
                  </a>
                </div>
              </div>

              <div className="branch-map">
                <iframe
                  src={`https://www.google.com/maps?q=${q}&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={b.mapTitle}
                />
              </div>
            </div>

            <section className="branch-sec">
              <h3 className="info-h2">{labels.photos}</h3>
              <PhotoGallery photos={b.photos} name={b.name} noPhotos={labels.noPhotos} />
            </section>

            <section className="branch-sec">
              <h3 className="info-h2">{b.advisorsTitle}</h3>
              {b.advisors.length > 0 ? (
                <div className="branch-advisors">
                  {b.advisors.map((adv) => (
                    <article key={adv.id} className="advisor-card">
                      <div className="advisor-head">
                        <div className="advisor-avatar" aria-hidden="true">
                          {adv.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- foto del asesor en el bucket sedes
                            <img src={adv.photoUrl} alt={adv.name} loading="lazy" />
                          ) : (
                            <span>{adv.initials}</span>
                          )}
                        </div>
                        <div>
                          <h4>{adv.name}</h4>
                          {adv.title && <p className="advisor-role">{adv.title}</p>}
                        </div>
                      </div>
                      <div className="advisor-actions">
                        <a className="btn y advisor-wa" href={adv.waHref} target="_blank" rel="noopener">
                          {labels.whatsapp}
                        </a>
                        <a className="btn advisor-call" href={`tel:+${adv.phone}`}>
                          {labels.call} · {adv.phoneFormatted}
                        </a>
                        {adv.email && (
                          <EmailChooser email={adv.email} labels={mail} className="btn advisor-email" inline>
                            {labels.email} · {adv.email}
                          </EmailChooser>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="branch-no-advisors">
                  <p>{labels.noAdvisors}</p>
                  <a className="btn y" href={b.generalWaHref} target="_blank" rel="noopener">
                    {labels.whatsapp}
                  </a>
                </div>
              )}
            </section>
          </div>
        );
      })}
    </>
  );
}

