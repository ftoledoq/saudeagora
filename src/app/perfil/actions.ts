"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Cancelamento de conta — decisão de retenção confirmada explicitamente
// antes de implementar (ver migration 0019): bookings/addresses NUNCA são
// apagados ou desvinculados, só os dados diretamente identificáveis são
// anonimizados. Sem chave service_role disponível neste ambiente pra
// desativar login via API admin do Supabase — a alternativa que não
// depende dela é embaralhar a própria senha (só a sessão atual, ainda
// autenticada, consegue fazer isso) e encerrar a sessão em seguida: sem
// saber a nova senha, a pessoa não consegue logar de novo.
export async function cancelarConta() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: professional }, { data: client }] = await Promise.all([
    supabase.from("professionals").select("id").eq("user_id", user.id).maybeSingle(),
    supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  if (professional) {
    // cpf/telefone/email têm constraint unique/not null — placeholder
    // derivado do próprio id garante unicidade sem reaproveitar dado real.
    const sufixo = professional.id.replace(/-/g, "").slice(0, 11);
    await supabase
      .from("professionals")
      .update({
        nome: "Usuário removido",
        cpf: sufixo,
        telefone: "removido",
        email: `removido+${professional.id}@saudeagora.invalid`,
        bio: null,
        foto_storage_key: null,
        status: "excluido",
      })
      .eq("id", professional.id);
  }

  if (client) {
    await supabase
      .from("clients")
      .update({
        nome: "Usuário removido",
        telefone: "removido",
        email: `removido+${client.id}@saudeagora.invalid`,
        bio: null,
        foto_storage_key: null,
      })
      .eq("id", client.id);
  }

  const senhaAleatoria = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  await supabase.auth.updateUser({
    password: senhaAleatoria,
    data: { conta_excluida: true },
  });

  await supabase.auth.signOut();
  redirect("/");
}
