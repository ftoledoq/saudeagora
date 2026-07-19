"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validarFoto, extensaoArquivo } from "@/lib/foto-upload";

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
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const fotoFile = formData.get("foto") as File | null;
  const temFotoNova = !!fotoFile && fotoFile.size > 0;

  if (!nome) return { error: "Nome é obrigatório.", success: false };
  if (!telefone) return { error: "Telefone é obrigatório.", success: false };
  if (temFotoNova) {
    const erroFoto = validarFoto(fotoFile!);
    if (erroFoto) return { error: erroFoto, success: false };
  }

  const table = tipo === "professional" ? "professionals" : "clients";
  const bucket = tipo === "professional" ? "professional-documents" : "client-photos";

  const { error } = await supabase.from(table).update({ nome, telefone, bio }).eq("user_id", user.id);
  if (error) return { error: error.message, success: false };

  if (temFotoNova) {
    const fotoPath = `${user.id}/foto-perfil.${extensaoArquivo(fotoFile!)}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fotoPath, fotoFile!, { contentType: fotoFile!.type, upsert: true });
    if (uploadError) return { error: `Não foi possível enviar a foto: ${uploadError.message}`, success: false };

    const { error: fotoUpdateError } = await supabase
      .from(table)
      .update({ foto_storage_key: fotoPath })
      .eq("user_id", user.id);
    if (fotoUpdateError) return { error: `Não foi possível registrar a foto: ${fotoUpdateError.message}`, success: false };
  }

  revalidatePath("/perfil");
  revalidatePath("/perfil/meus-dados");
  return { error: null, success: true };
}
