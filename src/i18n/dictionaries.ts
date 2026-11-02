import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "./config";
import type es from "./dictionaries/es.json";
import { getBrand } from "@/lib/supabase/public";
import { usesNewCopy } from "@/features/brand/brands";

export type Dictionary = typeof es;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  es: () => import("./dictionaries/es.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  pt: () => import("./dictionaries/pt.json").then((m) => m.default),
};

/** Idioma de la petición actual (segmento raíz /[lang]). */
export async function getLocale(): Promise<Locale> {
  const locale = await lang();
  if (!hasLocale(locale)) notFound();
  return locale;
}

/** Textos de la versión de marca «nueva» (y «roja»), encima del diccionario base. */
const newCopy: Record<Locale, () => Promise<unknown>> = {
  es: () => import("./brand/nueva.es.json").then((m) => m.default),
  en: () => import("./brand/nueva.en.json").then((m) => m.default),
  pt: () => import("./brand/nueva.pt.json").then((m) => m.default),
};

/** Mezcla profunda: los objetos se combinan; textos y listas del ajuste reemplazan a los base. */
function merge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== "object" || Array.isArray(over)) return (over ?? base) as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) out[k] = merge(out[k], v);
  return out as T;
}

export async function getDictionary(): Promise<Dictionary> {
  const locale = await getLocale();
  const [base, brand] = await Promise.all([dictionaries[locale](), getBrand()]);
  if (!usesNewCopy(brand)) return base;
  return merge(base, await newCopy[locale]());
}

/** Diccionario de un idioma concreto (para rutas sin segmento de idioma, p. ej. webhooks). */
export function dictionaryFor(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
