"use server";
import { updateTag } from "next/cache";import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { site } from "@/lib/site";
import { hasLocale, type Locale } from "@/i18n/config";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { purchaseEmail } from "@/features/sales/purchase-email";

export type SaleInput = {
  product: string;
  customerEmail: string;
  serial: string | null;
  priceCop: number | null;
  channel: string;
  soldOn: string | null;
  notes: string | null;
  markSold: boolean;
  warrantyMonths: number | null;
};
export type EmailStatus = "sent" | "not_configured" | "failed";
export type SaleResult = { ok: true; unitId: string; email: EmailStatus; emailDetail?: string } | { ok: false; error: string };

async function seller() {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "equipos.gestionar")) return null;
  return createSupabaseServerClient();
}

/** Registra la venta (la base de datos valida cuenta, serie y permisos) y avisa al cliente por correo. */
export async function registerSale(input: SaleInput): Promise<SaleResult> {
  const supabase = await seller();
  if (!supabase) return { ok: false, error: "No tienes permiso para registrar ventas." };
  const { data: unitId, error } = await supabase.rpc("register_sale", {
    product: input.product,
    customer_email: input.customerEmail,
    serial: input.serial,
    price_cop: input.priceCop,
    channel: input.channel,
    sold_on: input.soldOn,
    notes: input.notes,
    mark_sold: input.markSold,
    warranty_months: input.warrantyMonths,
  });
  if (error || !unitId) return { ok: false, error: error?.message ?? "No se pudo registrar la venta." };
  // El producto puede haber pasado a "Vendido": actualizar el sitio público ya mismo
  updateTag("catalog");
  const mail = await notify(supabase, unitId);
  return { ok: true, unitId, email: mail.status, emailDetail: mail.detail };
}

/** Anular una venta registrada por error (queda en el historial de cambios). */
export async function voidSale(unitId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await seller();
  if (!supabase) return { ok: false, error: "No tienes permiso para anular ventas." };
  const { error } = await supabase.rpc("delete_sale", { unit: unitId });
  if (error) return { ok: false, error: error.message };
  updateTag("catalog");
  return { ok: true };
}

/** Cambiar la garantía de una venta (0 o vacío = sin garantía). */
export async function setWarranty(unitId: string, starts: string, months: number | null): Promise<{ ok: boolean; error?: string }> {
  const supabase = await seller();
  if (!supabase) return { ok: false, error: "No tienes permiso para editar ventas." };
  const { error } = await supabase.rpc("set_unit_warranty", { unit: unitId, starts, months });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Reenviar el correo de una compra ya registrada. */
export async function resendPurchaseEmail(unitId: string): Promise<{ ok: boolean; email: EmailStatus; detail?: string }> {
  const supabase = await seller();
  if (!supabase) return { ok: false, email: "failed", detail: "Sin permiso" };
  const mail = await notify(supabase, unitId);
  return { ok: mail.status === "sent", email: mail.status, detail: mail.detail };
}

async function notify(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, unitId: string): Promise<{ status: EmailStatus; detail?: string }> {
  const { data: u } = await supabase
    .from("units")
    .select("id, serial, sold_at, warranty_start, warranty_end, products ( id, ref, name, manual_path ), owner:profiles!units_owner_id_fkey ( email, full_name, locale )")
    .eq("id", unitId)
    .single();
  if (!u?.owner?.email || !u.products) return { status: "failed", detail: "No se encontró el cliente o el producto" };

  const locale: Locale = hasLocale(u.owner.locale) ? u.owner.locale : "es";
  const names = u.products.name as Record<string, string>;
  const product = names[locale] || names.es || u.products.ref;
  const base = site.url.replace(/\/$/, "");
  const msg = purchaseEmail({
    locale,
    name: u.owner.full_name,
    product,
    ref: u.products.ref,
    serial: u.serial,
    soldOn: u.sold_at,
    warrantyEnd: u.warranty_end,
    accountUrl: `${base}/${locale}/cuenta`,
    manualUrl: u.products.manual_path ? `${base}/api/manual/${u.products.id}` : null,
    whatsappUrl: buildWhatsAppUrl(site.whatsappFallback, `JF Motores · ${u.products.ref}${u.serial ? ` · ${u.serial}` : ""}`),
  });
  const res = await sendEmail({ to: u.owner.email, ...msg });
  if (!res.ok) return { status: res.reason, detail: res.detail };
  await supabase.from("units").update({ notified_at: new Date().toISOString() }).eq("id", unitId);
  return { status: "sent" };
}
