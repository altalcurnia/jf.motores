"use client";
import { useRouter } from "next/navigation";

/** "← Volver": regresa a la página anterior; si se entró directo, va a la página de respaldo. */
export function BackButton({ label, fallback, className = "" }: { label: string; fallback: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`back-btn ${className}`}
      onClick={() => {
        const sameSite = document.referrer && new URL(document.referrer).origin === location.origin;
        if (sameSite && history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      <span aria-hidden="true">←</span> {label}
    </button>
  );
}
