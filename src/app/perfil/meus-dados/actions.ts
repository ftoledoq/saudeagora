"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MeusDadosFormState = {
  error: string | null;
  success: boolean;
};

export async function atualizarMeusDados(
  _prevState: MeusDadosFormState,
  formData: FormData
): Promise<MeusDadosFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, entre novamente.", success: false };

  const tipo = String(formData.get("tipo") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();

  if (!nome) return { error: "Nome é obrigatório.", success: false };
  if (!telefone) return { error: "Telefone é obrigatório.", success: false };

  const table = tipo === "professional" ? "professionals" : "clients";
  const { error } = await supabase.from(table).update({ nome, telefone }).eq("user_id", user.id);
  if (error) return { error: error.message, success: false };

  revalidatePath("/perfil");
  revalidatePath("/perfil/meus-dados");
  return { error: null, success: true };
}
