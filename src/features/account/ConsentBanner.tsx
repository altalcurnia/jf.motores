"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Locale } from "@/i18n/config";

/** Aviso en Mi cuenta para quien aún no autorizó el tratamiento de datos (p. ej. entró con Google). */
export function ConsentBanner({
  locale,
  text,
  linkText,
  accept,
}: {
  locale: Locale;
  text: string;
  linkText: string;
  accept: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onAccept() {
    setBusy(true);
    await createSupabaseBrowserClient().rpc("accept_privacy");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="acc-notice warn acc-consent">
      <span>
        {text}
        <Link href={`/${locale}/legal/privacidad`} target="_blank">
          {linkText}
        </Link>
        .
      </span>
      <button className="btn y" onClick={onAccept} disabled={busy}>
        {accept}
      </button>
    </div>
  );
}
