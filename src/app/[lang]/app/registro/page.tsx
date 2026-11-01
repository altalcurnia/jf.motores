import Link from "next/link";
import { Suspense } from "react";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WaitlistForm, type WaitlistValue } from "@/features/app-preview/WaitlistForm";

export async function generateMetadata() {
  const dict = await getDictionary();
  return { title: `${dict.appForm.title} · ${dict.app.title}`, robots: { index: false } };
}

export default async function WaitlistPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const t = dict.appForm;
  return (
    <section className="block cat-page wl-page">
      <header className="cat-head">
        <span className="app-badge">{dict.app.badge}</span>
        <div className="sk">{dict.app.title}</div>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </header>
      <Suspense fallback={<p className="acc-muted">…</p>}>
        <Content locale={locale} dict={dict} />
      </Suspense>
    </section>
  );
}

async function Content({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.appForm;
  const session = await getSession();
  if (!session) {
    const next = encodeURIComponent(`/${locale}/app/registro`);
    return (
      <div className="wl-login">
        <p>{t.needLogin}</p>
        <div className="cat-actions">
          <Link className="btn y" href={`/${locale}/cuenta/entrar?next=${next}`}>
            {t.signIn}
          </Link>
          <Link className="btn g" href={`/${locale}/cuenta/registro?next=${next}`}>
            {t.signUp}
          </Link>
        </div>
      </div>
    );
  }
  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: row }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, country").eq("id", session.userId).single(),
    supabase.from("app_waitlist").select("*").eq("user_id", session.userId).maybeSingle(),
  ]);
  const initial: WaitlistValue = {
    full_name: row?.full_name ?? profile?.full_name ?? "",
    phone: row?.phone ?? profile?.phone ?? "",
    country: row?.country ?? profile?.country ?? "",
    company: row?.company ?? "",
    role: row?.role ?? "",
    units_count: row?.units_count ?? "",
    site_type: row?.site_type ?? [],
    signal: row?.signal ?? "",
    plan: row?.plan ?? "",
    priorities: row?.priorities ?? [],
    site_visits: row?.site_visits ?? "",
    budget: row?.budget ?? "",
    comments: row?.comments ?? "",
    contact_ok: row?.contact_ok ?? true,
  };
  return <WaitlistForm t={t} locale={locale} userId={session.userId} initial={initial} exists={!!row} />;
}
