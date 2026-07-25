"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type RedefinirSenhaFormState = {
  error: string | null;
};

export async function redefinirSenha(
  _prevState: RedefinirSenhaFormState,
  formData: FormData
): Promise<RedefinirSenhaFormState> {
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (senha.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (senha !== confirmacao) return { error: "As senhas não conferem." };

  const supabase = await createClient();

  // Só funciona se a sessão de recuperação (criada pela troca do code em
  // auth/confirm/route.ts) ainda estiver ativa nos cookies — sem isso, o
  // Supabase rejeita a troca de senha por falta de sessão.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Link expirado ou já usado — solicite um novo em \"Esqueci minha senha\"." };
  }

  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { error: error.message };

  // Desloga a sessão de recuperação depois de trocar a senha — a pessoa
  // volta pro login e entra normalmente com a senha nova, em vez de ficar
  // logada a partir de um link de e-mail (mesmo padrão de segurança de
  // qualquer fluxo de reset: o link é de uso único, não vira sessão longa).
  await supabase.auth.signOut();

  // redirect() lança internamente — precisa ficar fora de qualquer
  // try/catch que engoliria a exceção de controle de fluxo do Next.js.
  redirect("/login?senha_redefinida=1");
}
