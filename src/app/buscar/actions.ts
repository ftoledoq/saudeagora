"use server";

import { createClient } from "@/lib/supabase/server";

export type RegistrarInteresseState = {
  error: string | null;
  ok: boolean;
};

// Sem sessão exigida (quem está fora de cobertura pode nem ter conta) —
// usa o client padrão (anon quando deslogado), coberto pela policy
// "interesse_regiao_insert_anon" (migration 0032).
export async function registrarInteresseRegiao(
  _prevState: RegistrarInteresseState,
  formData: FormData
): Promise<RegistrarInteresseState> {
  const email = String(formData.get("email") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();

  if (!email || !email.includes("@")) return { error: "E-mail inválido.", ok: false };
  if (!cidade) return { error: "Não foi possível identificar a região.", ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("interesse_regiao").insert({ cidade, email });
  if (error) return { error: "Não foi possível registrar seu interesse agora.", ok: false };

  return { error: null, ok: true };
}
