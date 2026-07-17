"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  if (!nome) return { error: "Nome é obrigatório." };
  if (!telefone) return { error: "Telefone é obrigatório." };
  if (!email || !email.includes("@")) return { error: "E-mail inválido." };
  if (password.length < 8) return { error: "Senha precisa ter pelo menos 8 caracteres." };

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
    return { error: "Conta criada, mas sem sessão ativa — tente entrar em /login." };
  }

  const { error: clientError } = await supabase
    .from("clients")
    .insert({ user_id: user.id, nome, telefone, email });
  if (clientError) return { error: `Não foi possível salvar seu cadastro: ${clientError.message}` };

  redirect(next);
}
