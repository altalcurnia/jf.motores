"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-redirect";
import type { Locale } from "@/i18n/config";
import { localeTags } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type T = Dictionary["account"];
type Props = { locale: Locale; t: T };

/** Países con presencia minera prioritaria primero; el resto se puede agregar sin tocar la base de datos. */
const COUNTRIES = ["CO", "PE", "EC", "BO", "CL", "BR", "VE", "PA", "MX", "AR", "GT", "HN", "NI", "CR", "DO", "US", "ES"];
const MIN_PASSWORD = 10;

function errorMessage(t: T, error: AuthError | null): string {
  if (!error) return t.errors.generic;
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") return t.errors.rate;
  if (error.code === "invalid_credentials") return t.errors.invalid;
  if (error.code === "email_not_confirmed") return t.errors.unconfirmed;
  if (error.code === "user_already_exists" || error.code === "email_exists") return t.errors.exists;
  if (error.code === "weak_password") return t.errors.weak;
  return t.errors.generic;
}

function callbackUrl(next: string) {
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", next);
  return url.toString();
}

function CheckEmail({ t, text, email }: { t: T; text: string; email: string }) {
  return (
    <div className="acc-notice ok" role="status">
      <b>{t.checkEmailTitle}</b>
      <p>{text.replace("{email}", email)}</p>
      <p className="acc-muted">{t.spamHint}</p>
    </div>
  );
}

function ErrorBox({ message }: { message: string | null }) {
  return message ? (
    <div className="acc-notice err" role="alert">
      {message}
    </div>
  ) : null;
}

/* ---------------- Entrar ---------------- */
export function SignInForm({ locale, t }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"), `/${locale}/cuenta`);
  const [useLink, setUseLink] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") === "enlace" ? t.errors.link : null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (useLink) {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl(next), shouldCreateUser: false },
      });
      setBusy(false);
      // Por privacidad no revelamos si el correo existe: siempre mostramos "revisa tu correo"
      if (err && err.status === 429) return setError(t.errors.rate);
      return setSent(true);
    }
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) return setError(errorMessage(t, err));
    router.replace(next);
    router.refresh();
  }

  if (sent) return <CheckEmail t={t} text={t.checkEmailLink} email={email} />;

  return (
    <form className="acc-form" onSubmit={onSubmit}>
      <label>
        {t.email}
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {!useLink && (
        <label>
          {t.password}
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
      )}
      <ErrorBox message={error} />
      <button className="btn y acc-submit" disabled={busy}>
        {busy ? t.sending : useLink ? t.sendLink : t.signIn}
      </button>
      <div className="acc-links">
        <button type="button" className="acc-linkbtn" onClick={() => setUseLink((v) => !v)}>
          {useLink ? t.usePassword : t.useLink}
        </button>
        <Link href={`/${locale}/cuenta/recuperar`}>{t.forgot}</Link>
      </div>
      <p className="acc-switch">
        {t.noAccount} <Link href={`/${locale}/cuenta/registro`}>{t.createOne}</Link>
      </p>
    </form>
  );
}

/* ---------------- Crear cuenta ---------------- */
export function SignUpForm({ locale, t }: Props) {
  const router = useRouter();
  const countryNames = useMemo(() => {
    const dn = new Intl.DisplayNames([localeTags[locale]], { type: "region" });
    return COUNTRIES.map((c) => ({ code: c, name: dn.of(c) ?? c })).sort((a, b) =>
      a.code === "CO" ? -1 : b.code === "CO" ? 1 : a.name.localeCompare(b.name, localeTags[locale]),
    );
  }, [locale]);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", country: "CO", password: "", confirm: "" });
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < MIN_PASSWORD) return setError(t.errors.weak);
    if (form.password !== form.confirm) return setError(t.errors.mismatch);
    if (!privacy) return setError(t.errors.privacy);
    setBusy(true);
    setError(null);
    const { data, error: err } = await createSupabaseBrowserClient().auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: callbackUrl(`/${locale}/cuenta`),
        data: {
          full_name: form.fullName.trim(),
          phone: form.phone.trim(),
          country: form.country,
          privacy_accepted: true,
          marketing_opt_in: marketing,
          locale,
        },
      },
    });
    setBusy(false);
    if (err) return setError(errorMessage(t, err));
    // Supabase oculta si el correo ya existe: devuelve un usuario sin identidades
    if (data.user && data.user.identities?.length === 0) return setError(t.errors.exists);
    if (data.session) {
      router.replace(`/${locale}/cuenta`);
      router.refresh();
      return;
    }
    setSent(true);
  }

  if (sent) return <CheckEmail t={t} text={t.checkEmailSignup} email={form.email} />;

  return (
    <form className="acc-form" onSubmit={onSubmit}>
      <label>
        {t.fullName}
        <input required autoComplete="name" maxLength={120} value={form.fullName} onChange={set("fullName")} />
      </label>
      <label>
        {t.email}
        <input type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
      </label>
      <div className="acc-row">
        <label>
          <span>
            {t.phone} <small>{t.phoneOptional}</small>
          </span>
          <input type="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={set("phone")} />
        </label>
        <label>
          {t.country}
          <select required value={form.country} onChange={set("country")} autoComplete="country">
            {countryNames.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="acc-row">
        <label>
          {t.password}
          <input type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" value={form.password} onChange={set("password")} />
          <small className="acc-muted">{t.passwordHint}</small>
        </label>
        <label>
          {t.confirmPassword}
          <input type="password" required autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
        </label>
      </div>
      <label className="acc-check">
        <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} required />
        <span>
          {t.acceptPrivacy1}
          <Link href={`/${locale}/legal/privacidad`} target="_blank">
            {t.privacyLink}
          </Link>
          {t.acceptPrivacy2}
        </span>
      </label>
      <label className="acc-check">
        <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
        <span>{t.marketingOptIn}</span>
      </label>
      <ErrorBox message={error} />
      <button className="btn y acc-submit" disabled={busy}>
        {busy ? t.sending : t.signUp}
      </button>
      <p className="acc-switch">
        {t.haveAccount} <Link href={`/${locale}/cuenta/entrar`}>{t.signInHere}</Link>
      </p>
    </form>
  );
}

/* ---------------- Recuperar contraseña ---------------- */
export function ForgotForm({ locale, t }: Props) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: callbackUrl(`/${locale}/cuenta/nueva-clave`),
    });
    setBusy(false);
    if (err && err.status === 429) return setError(t.errors.rate);
    setSent(true); // no revelamos si el correo existe
  }

  if (sent) return <CheckEmail t={t} text={t.checkEmailReset} email={email} />;

  return (
    <form className="acc-form" onSubmit={onSubmit}>
      <label>
        {t.email}
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <ErrorBox message={error} />
      <button className="btn y acc-submit" disabled={busy}>
        {busy ? t.sending : t.sendLink}
      </button>
      <p className="acc-switch">
        <Link href={`/${locale}/cuenta/entrar`}>{t.backToSignIn}</Link>
      </p>
    </form>
  );
}

/* ---------------- Nueva contraseña / cambiar contraseña ---------------- */
export function PasswordForm({ t, redirectTo }: { t: T; redirectTo?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setMsg({ ok: false, text: t.errors.weak });
    if (password !== confirm) return setMsg({ ok: false, text: t.errors.mismatch });
    setBusy(true);
    const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: errorMessage(t, error) });
    setPassword("");
    setConfirm("");
    setMsg({ ok: true, text: t.passwordSaved });
    if (redirectTo) router.replace(redirectTo);
  }

  return (
    <form className="acc-form" onSubmit={onSubmit}>
      <label>
        {t.newPassword}
        <input type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <small className="acc-muted">{t.passwordHint}</small>
      </label>
      <label>
        {t.confirmPassword}
        <input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      {msg && <div className={`acc-notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
      <button className="btn g acc-submit" disabled={busy}>
        {busy ? t.sending : t.savePassword}
      </button>
    </form>
  );
}

/* ---------------- Datos del perfil ---------------- */
export function ProfileForm({
  locale,
  t,
  initial,
}: Props & { initial: { fullName: string; phone: string; country: string; marketing: boolean; userId: string } }) {
  const router = useRouter();
  const countryNames = useMemo(() => {
    const dn = new Intl.DisplayNames([localeTags[locale]], { type: "region" });
    return COUNTRIES.map((c) => ({ code: c, name: dn.of(c) ?? c }));
  }, [locale]);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await createSupabaseBrowserClient()
      .from("profiles")
      .update({
        full_name: form.fullName.trim() || null,
        phone: form.phone.trim() || null,
        country: form.country || null,
        marketing_opt_in: form.marketing,
      })
      .eq("id", initial.userId);
    setBusy(false);
    setMsg(error ? { ok: false, text: t.errors.generic } : { ok: true, text: t.saved });
    if (!error) router.refresh();
  }

  return (
    <form className="acc-form" onSubmit={onSubmit}>
      <label>
        {t.fullName}
        <input maxLength={120} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
      </label>
      <div className="acc-row">
        <label>
          {t.phone}
          <input type="tel" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label>
          {t.country}
          <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            <option value="">{t.countryPlaceholder}</option>
            {countryNames.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="acc-check">
        <input type="checkbox" checked={form.marketing} onChange={(e) => setForm({ ...form, marketing: e.target.checked })} />
        <span>{t.marketingOptIn}</span>
      </label>
      {msg && <div className={`acc-notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
      <button className="btn g acc-submit" disabled={busy}>
        {busy ? t.sending : t.save}
      </button>
    </form>
  );
}
