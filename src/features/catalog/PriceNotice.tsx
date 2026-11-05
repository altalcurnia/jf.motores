import { getTrust } from "@/lib/supabase/public";

/** Aviso de precio: IVA (si el panel lo confirmó) + envío aparte. */
export async function vatPrefix(t: { vatIncluded: string; vatExcluded: string }) {
  const { vat } = await getTrust();
  return vat === true ? `${t.vatIncluded} ` : vat === false ? `${t.vatExcluded} ` : "";
}
