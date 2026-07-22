"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validarFoto, extensaoArquivo } from "@/lib/foto-upload";

export type RegistrarFormState = {
  error: string | null;
};

export async function registrarCliente(
  _prevState: RegistrarFormState,
  formData: FormData
): Promise<RegistrarFormState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const aceiteTermos = formData.get("aceite_termos") === "on";
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const fotoFile = formData.get("foto") as File | null;
  const temFoto = !!fotoFile && fotoFile.size > 0;
  // Indique amigos: só rastreamento por enquanto, sem recompensa — o valor
  // é o próprio user_id de quem indicou, vindo de ?ref= no link
  // compartilhado (ver /perfil/indicar). Não valida se o id existe de
  // verdade — é só um dado analítico, não uma referência com FK.
  const indicadoPor = String(formData.get("indicado_por") ?? "").trim() || null;

  if (!aceiteTermos) return { error: "É preciso aceitar os Termos e Políticas para criar conta." };
  if (!nome) return { error: "Nome é obrigatório." };
  if (!telefone) return { error: "Telefone é obrigatório." };
  if (!email || !email.includes("@")) return { error: "E-mail inválido." };
  if (password.length < 8) return { error: "Senha precisa ter pelo menos 8 caracteres." };
  if (temFoto) {
    const erroFoto = validarFoto(fotoFile!);
    if (erroFoto) return { error: erroFoto };
  }

  const supabase = await createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    // Mesma claim de papel gravada no cadastro de profissional — ver
    // cadastro/actions.ts e src/lib/role.ts.
    options: { data: { role: "cliente" } },
  });
  if (signUpError) {
    if (signUpError.message.toLowerCase().includes("already registered")) {
      return { error: "Já existe uma conta com esse e-mail." };
    }
    return { error: `Não foi possível criar a conta: ${signUpError.message}` };
  }
  const user = signUpData.user;
  if (!user || !signUpData.session) {
    return { error: "Conta criada, mas sem sessão ativa — tente entrar em /login." };
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      nome,
      telefone,
      email,
      bio,
      indicado_por: indicadoPor,
      termos_aceitos_em: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (clientError) return { error: `Não foi possível salvar seu cadastro: ${clientError.message}` };

  if (temFoto) {
    // Nome fixo (sem timestamp), mesma convenção do profissional (US-04):
    // a policy de storage casa por esse padrão exato de path.
    const fotoPath = `${user.id}/foto-perfil.${extensaoArquivo(fotoFile!)}`;
    const { error: fotoUploadError } = await supabase.storage
      .from("client-photos")
      .upload(fotoPath, fotoFile!, { contentType: fotoFile!.type });
    if (fotoUploadError) return { error: `Não foi possível enviar a foto: ${fotoUploadError.message}` };

    const { error: fotoUpdateError } = await supabase
      .from("clients")
      .update({ foto_storage_key: fotoPath })
      .eq("id", client.id);
    if (fotoUpdateError) return { error: `Não foi possível registrar a foto: ${fotoUpdateError.message}` };
  }

  redirect(next);
}
