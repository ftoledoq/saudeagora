"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { renovarHorizonteDisponibilidade } from "@/app/agenda/recurring";

export type LoginFormState = {
  error: string | null;
};

export async function login(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!email || !password) return { error: "Informe e-mail e senha." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou senha incorretos." };

  // Renova o horizonte de disponibilidade recorrente aqui também, não só
  // ao visitar /agenda (ver recurring.ts) — profissional que some por
  // semanas/meses e só volta a fazer login (sem necessariamente abrir a
  // Agenda logo em seguida) ainda tem o horizonte estendido nesse momento,
  // reduzindo bastante a chance de sumir da busca por completo. Falha
  // silenciosa de propósito (.catch): se der erro aqui, não pode travar
  // o login de ninguém — só decidir "quantas semanas de agenda existem".
  const { data: professional } = await supabase
    .from("professionals")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (professional) {
    await renovarHorizonteDisponibilidade(supabase, professional.id).catch(() => {});
  }

  redirect(next);
}
