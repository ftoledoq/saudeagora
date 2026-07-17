"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidCpf, normalizeCpf } from "@/lib/cpf";
import type { ServiceTipo } from "@/types/database";

export type CadastroFormState = {
  error: string | null;
};

const SERVICE_TIPOS: ServiceTipo[] = ["personal_trainer", "massagem", "pilates"];
const FOTO_TIPOS_ACEITOS = ["image/jpeg", "image/png"];
const FOTO_TAMANHO_MAX_BYTES = 5 * 1024 * 1024;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function num(formData: FormData, key: string): number {
  return Number(str(formData, key).replace(",", "."));
}

function fileExtension(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return fromType ?? "bin";
}

export async function cadastrarProfissional(
  _prevState: CadastroFormState,
  formData: FormData
): Promise<CadastroFormState> {
  const email = str(formData, "email");
  const password = str(formData, "password");
  const nome = str(formData, "nome");
  const cpf = normalizeCpf(str(formData, "cpf"));
  const telefone = str(formData, "telefone");

  const rua = str(formData, "rua");
  const bairroId = str(formData, "bairro_id");
  const referencia = str(formData, "referencia") || null;

  const tipo = str(formData, "tipo") as ServiceTipo;
  const preco = num(formData, "preco");
  const duracaoMin = num(formData, "duracao_min");
  const raioAtendimentoKm = num(formData, "raio_atendimento_km");
  const descricao = str(formData, "descricao") || null;

  const bio = str(formData, "bio") || null;
  const fotoFile = formData.get("foto") as File | null;
  const temFoto = !!fotoFile && fotoFile.size > 0;

  const identidadeFile = formData.get("identidade") as File | null;
  const crefFile = formData.get("cref") as File | null;
  const crefValidade = str(formData, "cref_validade");

  // Validação — nunca confiar só no que o formulário no navegador já checou.
  if (!email || !email.includes("@")) return { error: "E-mail inválido." };
  if (password.length < 8) return { error: "Senha precisa ter pelo menos 8 caracteres." };
  if (!nome) return { error: "Nome completo é obrigatório." };
  if (!isValidCpf(cpf)) return { error: "CPF inválido." };
  if (!telefone) return { error: "Telefone é obrigatório." };
  if (!rua) return { error: "Endereço incompleto." };
  if (!bairroId) return { error: "Selecione o bairro onde você atende." };
  if (!SERVICE_TIPOS.includes(tipo)) return { error: "Selecione um tipo de serviço." };
  if (!(preco > 0)) return { error: "Preço do atendimento precisa ser maior que zero." };
  if (!(duracaoMin > 0)) return { error: "Duração da sessão precisa ser maior que zero." };
  if (!(raioAtendimentoKm > 0)) return { error: "Raio de atendimento precisa ser maior que zero." };
  if (temFoto) {
    if (!FOTO_TIPOS_ACEITOS.includes(fotoFile!.type))
      return { error: "Foto precisa ser JPG ou PNG." };
    if (fotoFile!.size > FOTO_TAMANHO_MAX_BYTES)
      return { error: "Foto precisa ter até 5MB." };
  }
  if (!identidadeFile || identidadeFile.size === 0)
    return { error: "Envie o documento de identidade." };
  if (tipo === "personal_trainer") {
    if (!crefFile || crefFile.size === 0)
      return { error: "Personal trainer precisa enviar o comprovante de CREF." };
    if (!crefValidade) return { error: "Informe a validade do CREF." };
  }

  const supabase = await createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (signUpError) {
    if (signUpError.message.toLowerCase().includes("already registered")) {
      return { error: "Já existe uma conta com esse e-mail." };
    }
    return { error: `Não foi possível criar a conta: ${signUpError.message}` };
  }
  const user = signUpData.user;
  if (!user || !signUpData.session) {
    return {
      error:
        "Conta criada, mas sem sessão ativa — confirmação de e-mail pode estar habilitada no projeto Supabase.",
    };
  }

  const { data: address, error: addressError } = await supabase
    .from("addresses")
    .insert({ user_id: user.id, rua, bairro_id: bairroId, referencia })
    .select("id")
    .single();
  if (addressError) return { error: `Não foi possível salvar o endereço: ${addressError.message}` };

  const { data: professional, error: professionalError } = await supabase
    .from("professionals")
    .insert({
      user_id: user.id,
      nome,
      cpf,
      telefone,
      email,
      endereco_base_id: address.id,
      raio_atendimento_km: raioAtendimentoKm,
      preco_base: preco,
      bio,
    })
    .select("id")
    .single();
  if (professionalError) {
    if (professionalError.message.includes("professionals_cpf_key")) {
      return { error: "Já existe um cadastro com esse CPF." };
    }
    return { error: `Não foi possível salvar o cadastro: ${professionalError.message}` };
  }

  const { error: serviceError } = await supabase.from("services").insert({
    professional_id: professional.id,
    tipo,
    preco,
    duracao_min: duracaoMin,
    descricao,
  });
  if (serviceError) return { error: `Não foi possível salvar o serviço: ${serviceError.message}` };

  if (temFoto) {
    // Nome fixo (sem timestamp): a policy pública de leitura da foto casa
    // por esse padrão exato, e não precisamos de histórico de fotos.
    const fotoPath = `${user.id}/foto-perfil.${fileExtension(fotoFile!)}`;
    const { error: fotoUploadError } = await supabase.storage
      .from("professional-documents")
      .upload(fotoPath, fotoFile!, { contentType: fotoFile!.type });
    if (fotoUploadError)
      return { error: `Não foi possível enviar a foto: ${fotoUploadError.message}` };

    const { error: fotoUpdateError } = await supabase
      .from("professionals")
      .update({ foto_storage_key: fotoPath })
      .eq("id", professional.id);
    if (fotoUpdateError)
      return { error: `Não foi possível registrar a foto: ${fotoUpdateError.message}` };
  }

  const identidadePath = `${user.id}/identidade-${Date.now()}.${fileExtension(identidadeFile)}`;
  const { error: identidadeUploadError } = await supabase.storage
    .from("professional-documents")
    .upload(identidadePath, identidadeFile, { contentType: identidadeFile.type });
  if (identidadeUploadError)
    return { error: `Não foi possível enviar o documento de identidade: ${identidadeUploadError.message}` };

  const { error: identidadeDocError } = await supabase.from("professional_documents").insert({
    professional_id: professional.id,
    tipo: "identidade",
    storage_key: identidadePath,
  });
  if (identidadeDocError)
    return { error: `Não foi possível registrar o documento de identidade: ${identidadeDocError.message}` };

  if (tipo === "personal_trainer" && crefFile) {
    const crefPath = `${user.id}/cref-${Date.now()}.${fileExtension(crefFile)}`;
    const { error: crefUploadError } = await supabase.storage
      .from("professional-documents")
      .upload(crefPath, crefFile, { contentType: crefFile.type });
    if (crefUploadError)
      return { error: `Não foi possível enviar o comprovante de CREF: ${crefUploadError.message}` };

    const { error: crefDocError } = await supabase.from("professional_documents").insert({
      professional_id: professional.id,
      tipo: "cref",
      storage_key: crefPath,
      validade: crefValidade,
    });
    if (crefDocError)
      return { error: `Não foi possível registrar o comprovante de CREF: ${crefDocError.message}` };
  }

  redirect("/cadastro/recebido");
}
