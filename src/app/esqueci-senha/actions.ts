"use server";

import { createClient } from "@/lib/supabase/server";

export type EsqueciSenhaFormState = {
  error: string | null;
  enviado: boolean;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Mesma mensagem de sucesso independente do e-mail existir ou não — não dar
// pra alguém descobrir por aqui quais e-mails têm conta cadastrada. O
// Supabase já se comporta assim (resetPasswordForEmail não erra pra e-mail
// inexistente), só reforçamos não expondo esse detalhe na mensagem também.
export async function solicitarRedefinicaoSenha(
  _prevState: EsqueciSenhaFormState,
  formData: FormData
): Promise<EsqueciSenhaFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe seu e-mail.", enviado: false };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP_URL}/auth/confirm?next=/redefinir-senha`,
  });
  if (error) return { error: error.message, enviado: false };

  return { error: null, enviado: true };
}
