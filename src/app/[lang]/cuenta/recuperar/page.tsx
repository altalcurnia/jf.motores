import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { AccountShell } from "@/features/account/AccountShell";
import { ForgotForm } from "@/features/account/forms";

export async function generateMetadata() {
  const dict = await getDictionary();
  return { title: dict.account.forgotTitle, robots: { index: false } };
}

export default async function ForgotPage() {
  const locale = await getLocale();
  const t = (await getDictionary()).account;
  return (
    <AccountShell kicker={t.myAccount} title={t.forgotTitle} subtitle={t.forgotSubtitle}>
      <ForgotForm locale={locale} t={t} />
    </AccountShell>
  );
}
