"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Checagem redundante de propósito: a RLS já bloqueia quem não é admin no
// banco, mas uma Server Action é um endpoint POST alcançável por qualquer
// um, então autoriza de novo aqui antes de agir (nunca confiar só na UI).
async function assertAdmin(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin) throw new Error("Sem permissão de admin.");
}

export async function aprovarProfissional(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const id = String(formData.get("id"));
  const { error } = await supabase
    .from("professionals")
    .update({ status: "aprovado", motivo_recusa: null })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/aprovacoes");
}

export async function recusarProfissional(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const id = String(formData.get("id"));
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) throw new Error("Informe o motivo da recusa antes de enviar.");

  const { error } = await supabase
    .from("professionals")
    .update({ status: "recusado", motivo_recusa: motivo })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/aprovacoes");
}
