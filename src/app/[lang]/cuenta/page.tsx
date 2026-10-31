import Link from "next/link";
import { Suspense } from "react";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localeTags, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PasswordForm, ProfileForm } from "@/features/account/forms";
import { ConsentBanner } from "@/features/account/ConsentBanner";

export async function generateMetadata() {
  const dict = await getDictionary();
  return { title: dict.account.myAccount, robots: { index: false } };
}

export default async function AccountPage() {
  const locale = await getLocale();
  const t = (await getDictionary()).account;
  return (
    <section className="block acc-page">
      <Suspense fallback={<p className="acc-muted">…</p>}>
        <AccountDashboard locale={locale} t={t} />
      </Suspense>
    </section>
  );
}

function pick(value: unknown, locale: Locale): string {
  if (value && typeof value === "object") {
    const v = value as Record<string, string>;
    return v[locale] ?? v.es ?? "";
  }
  return "";
}

async function AccountDashboard({ locale, t }: { locale: Locale; t: Dictionary["account"] }) {
  const session = await getSession();
  if (!session) {
    return (
      <p>
        <Link href={`/${locale}/cuenta/entrar`}>{t.signIn}</Link>
      </p>
    );
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: units }, { data: leads }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, country, marketing_opt_in, privacy_accepted_at").eq("id", session.userId).single(),
    supabase
      .from("units")
      .select("id, serial, sold_at, products ( ref, name )")
      .eq("owner_id", session.userId)
      .order("sold_at", { ascending: false }),
    supabase
      .from("leads")
      .select("id, created_at, status, products ( ref, name )")
      .eq("customer_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const dateFmt = new Intl.DateTimeFormat(localeTags[locale], { dateStyle: "medium" });

  return (
    <div className="acc-dash">
      <header className="acc-dash-head">
        <div>
          <div className="sk">{t.myAccount}</div>
          <h1>
            {t.hello}
            {profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="acc-muted">{session.email}</p>
        </div>
        <div className="acc-dash-actions">
          {session.role.isInternal && (
            <Link className="btn y" href="/admin">
              {t.staffPanel}
            </Link>
          )}
          <form action={`/auth/signout?next=/${locale}`} method="post">
            <button className="btn g">{t.signOut}</button>
          </form>
        </div>
      </header>

      {profile && !profile.privacy_accepted_at && (
        <ConsentBanner locale={locale} text={t.consentBanner} linkText={t.privacyLink} accept={t.consentAccept} />
      )}

      <div className="acc-dash-grid">
        <section className="acc-card">
          <h2>{t.equipmentTitle}</h2>
          {units && units.length > 0 ? (
            <ul className="acc-list">
              {units.map((u) => (
                <li key={u.id}>
                  <b>{u.products ? pick(u.products.name, locale) || u.products.ref : "—"}</b>
                  <span>
                    {t.serial}: {u.serial}
                    {u.sold_at ? ` · ${t.soldOn} ${dateFmt.format(new Date(u.sold_at))}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="acc-muted">{t.equipmentEmpty}</p>
          )}
        </section>

        <section className="acc-card">
          <h2>{t.quotesTitle}</h2>
          {leads && leads.length > 0 ? (
            <ul className="acc-list">
              {leads.map((l) => (
                <li key={l.id}>
                  <b>{l.products ? pick(l.products.name, locale) || l.products.ref : "—"}</b>
                  <span>
                    {dateFmt.format(new Date(l.created_at))} · {t.quoteStatus[l.status]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="acc-muted">{t.quotesEmpty}</p>
          )}
        </section>

        <section className="acc-card">
          <h2>{t.profileTitle}</h2>
          <ProfileForm
            locale={locale}
            t={t}
            initial={{
              userId: session.userId,
              fullName: profile?.full_name ?? "",
              phone: profile?.phone ?? "",
              country: profile?.country ?? "",
              marketing: profile?.marketing_opt_in ?? false,
            }}
          />
        </section>

        <section className="acc-card">
          <h2>{t.passwordTitle}</h2>
          {session.providers.includes("google") ? (
            <>
              <p className="acc-muted">{t.googleNoPassword}</p>
              <details className="acc-details">
                <summary>{t.optionalPassword}</summary>
                <PasswordForm t={t} />
              </details>
            </>
          ) : (
            <PasswordForm t={t} />
          )}
        </section>
      </div>
    </div>
  );
}
