"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

const TIPOS_VALIDOS = ["personal_trainer", "massagem", "pilates"];

// Mínimo pra destravar teste real de múltiplos serviços (decisão do
// founder): só cria um serviço novo — remover/reordenar os já existentes
// continua fora do escopo (editar preço/duração já existe, ver
// editarServico abaixo). Sem isso, a correção de "duração por serviço" na
// Agenda (migration 0027) não tinha como ser exercitada por nenhum
// profissional real — o cadastro só cria um serviço por vez, e não
// existia nenhuma tela pra adicionar o segundo.
export async function adicionarServico(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: professional } = await supabase
    .from("professionals")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!professional) return { error: "Essa área é só para profissionais cadastrados." };

  const tipo = String(formData.get("tipo") ?? "");
  const preco = Number(formData.get("preco") ?? "0");
  const duracaoMin = Number(formData.get("duracao_min") ?? "0");
  const descricao = String(formData.get("descricao") ?? "").trim() || null;

  if (!TIPOS_VALIDOS.includes(tipo)) return { error: "Escolha um tipo de serviço válido." };
  if (!(preco > 0)) return { error: "Informe um preço válido." };
  if (!(duracaoMin > 0)) return { error: "Informe uma duração válida." };

  const { error } = await supabase.from("services").insert({
    professional_id: professional.id,
    tipo,
    preco,
    duracao_min: duracaoMin,
    descricao,
  });
  if (error) return { error: error.message };

  revalidatePath("/perfil");
  return { error: null };
}

// Só preço e duração — tipo não é editável aqui (trocar o tipo de um
// serviço já oferecido é o mesmo que criar um serviço diferente, não uma
// correção). Precisa da policy "services_update_own" (migration 0028) —
// sem ela o UPDATE volta 0 linhas afetadas em silêncio (RLS filtra, não dá
// erro), por isso o id também é revalidado contra o professional_id aqui,
// não só confiado ao formulário.
export async function editarServico(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: professional } = await supabase
    .from("professionals")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!professional) return { error: "Essa área é só para profissionais cadastrados." };

  const id = String(formData.get("id") ?? "");
  const preco = Number(formData.get("preco") ?? "0");
  const duracaoMin = Number(formData.get("duracao_min") ?? "0");

  if (!id) return { error: "Serviço inválido." };
  if (!(preco > 0)) return { error: "Informe um preço válido." };
  if (!(duracaoMin > 0)) return { error: "Informe uma duração válida." };

  const { error } = await supabase
    .from("services")
    .update({ preco, duracao_min: duracaoMin })
    .eq("id", id)
    .eq("professional_id", professional.id);
  if (error) return { error: error.message };

  revalidatePath("/perfil");
  revalidatePath("/agenda");
  return { error: null };
}

// Pausa reversível por serviço (migration 0029), mesma filosofia de
// desativarConta — nunca apaga cadastro nem histórico. Confirmado com o
// founder: permite desativar mesmo com agendamento pendente/confirmado
// futuro desse serviço (a tela avisa antes, com a contagem real — ver
// perfil/page.tsx), só não deixa esse serviço aceitar pedido novo daqui
// pra frente.
export async function desativarServico(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: professional } = await supabase
    .from("professionals")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!professional) redirect("/perfil");

  const id = String(formData.get("id") ?? "");

  await supabase
    .from("services")
    .update({ ativo: false })
    .eq("id", id)
    .eq("professional_id", professional.id);

  // "Não quero mais atender" precisa parar de verdade, não só sumir da
  // busca: sem isso, o padrão recorrente continuaria gerando horário novo
  // toda semana pra um serviço que o profissional acabou de desligar.
  // Nunca toca em 'bloqueado' — agendamento já confirmado/pendente
  // continua de pé (decisão confirmada acima), só o horário 'livre' (ainda
  // não reservado) some, junto com a regra que o gerava.
  await supabase
    .from("recurring_availability")
    .delete()
    .eq("professional_id", professional.id)
    .eq("service_id", id);
  await supabase
    .from("availability")
    .delete()
    .eq("professional_id", professional.id)
    .eq("service_id", id)
    .eq("status", "livre");

  revalidatePath("/perfil");
  revalidatePath("/agenda");
}

export async function reativarServico(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: professional } = await supabase
    .from("professionals")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!professional) redirect("/perfil");

  const id = String(formData.get("id") ?? "");
  await supabase
    .from("services")
    .update({ ativo: true })
    .eq("id", id)
    .eq("professional_id", professional.id);

  revalidatePath("/perfil");
  revalidatePath("/agenda");
}

// Pausa reversível (migration 0022) — some da busca (profissional), mas
// login continua funcionando normalmente e nenhum dado é tocado. Um clique,
// sem confirmação extra: não é destrutivo, não há motivo pra fricção.
export async function desativarConta() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await Promise.all([
    supabase.from("professionals").update({ ativo: false }).eq("user_id", user.id),
    supabase.from("clients").update({ ativo: false }).eq("user_id", user.id),
  ]);

  redirect("/perfil");
}

export async function reativarConta() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await Promise.all([
    supabase.from("professionals").update({ ativo: true }).eq("user_id", user.id),
    supabase.from("clients").update({ ativo: true }).eq("user_id", user.id),
  ]);

  redirect("/perfil");
}

// Exclusão PERMANENTE — decisão de retenção confirmada explicitamente
// antes de implementar (ver migration 0019): bookings/addresses NUNCA são
// apagados ou desvinculados, só os dados diretamente identificáveis são
// anonimizados. Sem chave service_role disponível neste ambiente pra
// desativar login via API admin do Supabase — a alternativa que não
// depende dela é embaralhar a própria senha (só a sessão atual, ainda
// autenticada, consegue fazer isso) e encerrar a sessão em seguida: sem
// saber a nova senha, a pessoa não consegue logar de novo. Continua uma
// única confirmação nativa (ConfirmarAcaoButton), sem passo extra — CDC
// art. 72 pune quem dificulta exclusão de dado do consumidor.
export async function excluirContaPermanentemente() {
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
