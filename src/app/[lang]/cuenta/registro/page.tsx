import { Suspense } from "react";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/i18n/metadata";
import { AccountShell } from "@/features/account/AccountShell";
import { SignUpForm } from "@/features/account/forms";

export async function generateMetadata() {
  const dict = await getDictionary();
  return { title: dict.account.signUp, alternates: localizedAlternates(await getLocale(), "/cuenta/registro") };
}

export default async function SignUpPage() {
  const locale = await getLocale();
  const t = (await getDictionary()).account;
  return (
    <AccountShell
      kicker={t.myAccount}
      title={t.signUpTitle}
      subtitle={t.signUpSubtitle}
      aside={
        <ul className="acc-benefits">
          {t.benefits.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      }
    >
      <Suspense>
        <SignUpForm locale={locale} t={t} />
      </Suspense>
    </AccountShell>
  );
}
