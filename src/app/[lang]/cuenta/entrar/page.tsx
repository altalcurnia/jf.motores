import { Suspense } from "react";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/i18n/metadata";
import { AccountShell } from "@/features/account/AccountShell";
import { SignInForm } from "@/features/account/forms";

export async function generateMetadata() {
  const dict = await getDictionary();
  return {
    title: dict.account.signIn,
    robots: { index: false },
    alternates: localizedAlternates(await getLocale(), "/cuenta/entrar"),
  };
}

export default async function SignInPage() {
  const locale = await getLocale();
  const t = (await getDictionary()).account;
  return (
    <AccountShell kicker={t.myAccount} title={t.signInTitle} subtitle={t.signInSubtitle}>
      <Suspense>
        <SignInForm locale={locale} t={t} />
      </Suspense>
    </AccountShell>
  );
}
