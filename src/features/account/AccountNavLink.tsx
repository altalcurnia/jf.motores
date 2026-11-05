"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Locale } from "@/i18n/config";

/** Enlace del encabezado: "Entrar" o "Mi cuenta" según la sesión (se resuelve en el navegador). */
export function AccountNavLink({ locale, signIn, myAccount }: { locale: Locale; signIn: string; myAccount: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      return; // sin configuración de Supabase (p. ej. pruebas locales)
    }
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  const label = signedIn ? myAccount : signIn;
  return (
    <Link className="acc-nav" href={`/${locale}/cuenta${signedIn ? "" : "/entrar"}`} aria-label={label}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
      <span>{label}</span>
    </Link>
  );
}
