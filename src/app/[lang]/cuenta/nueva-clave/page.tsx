import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { AccountShell } from "@/features/account/AccountShell";
import { PasswordForm } from "@/features/account/forms";

export async function generateMetadata() {
  const dict = await getDictionary();
  return { title: dict.account.newPasswordTitle, robots: { index: false } };
}

/** Llega aquí desde el enlace de "recuperar contraseña" (ya con sesión iniciada). */
export default async function NewPasswordPage() {
  const locale = await getLocale();
  const t = (await getDictionary()).account;
  return (
    <AccountShell kicker={t.myAccount} title={t.newPasswordTitle} subtitle={t.passwordHint}>
      <PasswordForm t={t} redirectTo={`/${locale}/cuenta`} />
    </AccountShell>
  );
}
