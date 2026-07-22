"use server";

import { createClient } from "@/lib/supabase/server";

export type SegurancaFormState = { error: string | null; sucesso: boolean };

export async function trocarSenha(
  _prevState: SegurancaFormState,
  formData: FormData
): Promise<SegurancaFormState> {
  const novaSenha = String(formData.get("nova_senha") ?? "");
  if (novaSenha.length < 8) {
    return { error: "A nova senha precisa ter pelo menos 8 caracteres.", sucesso: false };
  }

  const supabase = await createClient();
  // Fluxo nativo do Supabase Auth — sessão já autenticada troca a própria
  // senha diretamente, sem precisar reconfirmar a senha atual (mesmo
  // padrão simples já usado no resto do app nesta fase).
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) return { error: error.message, sucesso: false };

  return { error: null, sucesso: true };
}
