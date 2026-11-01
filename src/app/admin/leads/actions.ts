"use server";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LeadStatus = "nuevo" | "contactado" | "cotizado" | "vendido" | "perdido";
const STATUSES: LeadStatus[] = ["nuevo", "contactado", "cotizado", "vendido", "perdido"];

/** Cambia estado y notas de un lead. La base de datos valida (RLS): gestor de leads o su asesor. */
export async function updateLead(id: string, patch: { status?: LeadStatus; notes?: string }): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !session.role.isInternal) return { ok: false, error: "No tienes permiso." };
  const row: { status?: LeadStatus; notes?: string | null } = {};
  if (patch.status) {
    if (!STATUSES.includes(patch.status)) return { ok: false, error: "Estado inválido." };
    row.status = patch.status;
  }
  if (patch.notes !== undefined) row.notes = patch.notes.trim().slice(0, 2000) || null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("leads").update(row).eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "No tienes permiso para cambiar este lead." };
  return { ok: true };
}
