"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { avisarPedidoConfirmado, avisarPedidoRecusado } from "@/lib/email";
import { somarMinutos } from "./shared";
import { renovarHorizonteDisponibilidade } from "./recurring";
import type { SupabaseClient } from "@supabase/supabase-js";

async function getOwnProfessional(
  supabase: SupabaseClient
): Promise<{ id: string; nome: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: professional } = await supabase
    .from("professionals")
    .select("id, nome")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!professional) throw new Error("Essa área é só para profissionais cadastrados.");

  return professional;
}

// Retorna { error } em vez de lançar (diferente do resto deste arquivo):
// chamada diretamente (não via <form>) pela grade semanal
// (grade-semanal.tsx), e Next.js redacta a mensagem de qualquer erro
// lançado por uma Server Action em produção (por segurança, só sobra um
// "digest" opaco) — mesmo quando chamada indiretamente por outra função
// no mesmo arquivo "use server". Só devolvendo o erro como valor normal é
// que a mensagem amigável chega inteira até a tela. Descoberto ao testar
// ao vivo o bloqueio por exceção (migration 0025): o insert era rejeitado
// corretamente, mas a tela quebrava pra uma página de erro genérica.
export async function adicionarDisponibilidade(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { id: professionalId } = await getOwnProfessional(supabase);

  const data = String(formData.get("data") ?? "");
  const horaInicio = String(formData.get("hora_inicio") ?? "");
  const serviceId = String(formData.get("service_id") ?? "");

  if (!data || !horaInicio) return { error: "Preencha data e horário." };
  if (!serviceId) return { error: "Escolha o serviço desse horário." };

  // "Fim" nunca vem do formulário (era o bug: início e fim caindo no mesmo
  // valor padrão do seletor de hora nativo, gerando horário de duração
  // zero) — é sempre calculado a partir da duração do SERVIÇO ESCOLHIDO,
  // nunca de um valor único do profissional (bug de arquitetura real: o
  // modelo sempre suportou múltiplos serviços com durações diferentes,
  // mas a geração de horário usava só "o" serviço do profissional).
  const { data: service } = await supabase
    .from("services")
    .select("duracao_min")
    .eq("id", serviceId)
    .eq("professional_id", professionalId)
    .maybeSingle();
  if (!service) return { error: "Serviço inválido." };

  const horaFim = somarMinutos(horaInicio, service.duracao_min);

  const { error } = await supabase.from("availability").insert({
    professional_id: professionalId,
    data,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    service_id: serviceId,
  });
  if (error) {
    if (error.message.includes("availability_professional_id_data_hora_inicio_key")) {
      return { error: "Você já tem um horário cadastrado nesse dia e hora de início." };
    }
    // Trigger guard_availability_exception (migration 0025) — bug real
    // encontrado em teste: dava pra criar horário avulso num dia que o
    // próprio profissional tinha acabado de bloquear como exceção ao
    // padrão. Reforçado no banco, não só aqui — esta mensagem só traduz
    // o erro pra algo legível.
    if (error.message.includes("bloqueado por exceção")) {
      return {
        error: "Esse dia está bloqueado por exceção ao padrão recorrente — desbloqueie antes de adicionar horário.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/agenda");
  return { error: null };
}

export async function removerDisponibilidade(formData: FormData) {
  const supabase = await createClient();
  const { id: professionalId } = await getOwnProfessional(supabase);

  const id = String(formData.get("id") ?? "");

  const { data: slot } = await supabase
    .from("availability")
    .select("data, hora_inicio")
    .eq("id", id)
    .eq("professional_id", professionalId)
    .eq("status", "livre")
    .maybeSingle();
  if (!slot) return;

  const { error } = await supabase
    .from("availability")
    .delete()
    .eq("id", id)
    .eq("professional_id", professionalId)
    .eq("status", "livre");
  if (error) throw new Error(error.message);

  // Bug real encontrado em teste: remover um horário gerado pelo padrão
  // recorrente não registrava exceção nenhuma — a próxima renovação do
  // horizonte (recurring.ts) recriava a mesma linha, porque nada indicava
  // que aquele dia específico tinha sido removido de propósito (o horário
  // reaparecia como "Livre" depois de revisitar a Agenda). Corrigido
  // registrando a mesma exceção que "Bloquear um dia" já usa, sempre que
  // o horário removido bate com uma regra ativa do padrão (mesmo dia da
  // semana + mesma hora de início) — reaproveita o mecanismo existente em
  // vez de um novo, e o profissional já pode desfazer isso na lista de
  // exceções ("Desbloquear"). Horário avulso de verdade (sem regra
  // correspondente) continua só sendo apagado, sem gerar exceção nenhuma.
  const diaSemana = new Date(`${slot.data}T00:00:00Z`).getUTCDay();
  const { data: regraDoPadrao } = await supabase
    .from("recurring_availability")
    .select("id")
    .eq("professional_id", professionalId)
    .eq("dia_semana", diaSemana)
    .eq("hora_inicio", slot.hora_inicio)
    .maybeSingle();
  if (regraDoPadrao) {
    await supabase
      .from("availability_exceptions")
      .upsert({ professional_id: professionalId, data: slot.data }, { onConflict: "professional_id,data" });
  }

  revalidatePath("/agenda");
}

// Cada padrão salvo é um GRUPO (grupo_id) — um conjunto de dias + um
// horário + um serviço, independente dos outros grupos do profissional.
// Antes disso, salvar sempre apagava TODAS as regras do profissional
// (só dava pra ter um padrão de cada vez) — lacuna real de produto,
// corrigida aqui. Sem grupo_id no form = cria um grupo novo; com
// grupo_id = edita o grupo existente (apaga só as linhas desse grupo,
// insere as novas no lugar, mesmo grupo_id preservado). Retorna
// { error } em vez de lançar — mesmo motivo de adicionarDisponibilidade.
export async function salvarPadraoRecorrente(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { id: professionalId } = await getOwnProfessional(supabase);

  const dias = formData.getAll("dias").map(Number).filter((d) => d >= 0 && d <= 6);
  const horaInicio = String(formData.get("hora_inicio") ?? "");
  const serviceId = String(formData.get("service_id") ?? "");
  const grupoIdExistente = String(formData.get("grupo_id") ?? "") || null;

  if (dias.length === 0) return { error: "Selecione ao menos um dia da semana." };
  if (!horaInicio) return { error: "Preencha o horário de início." };
  if (!serviceId) return { error: "Escolha o serviço desse padrão." };

  const { data: service } = await supabase
    .from("services")
    .select("duracao_min")
    .eq("id", serviceId)
    .eq("professional_id", professionalId)
    .maybeSingle();
  if (!service) return { error: "Serviço inválido." };

  const horaFim = somarMinutos(horaInicio, service.duracao_min);
  const grupoId = grupoIdExistente ?? crypto.randomUUID();

  // Regras antigas do grupo (antes de apagar) — precisamos delas depois
  // pra limpar os horários 'livre' que essas regras tinham gerado. Editar
  // um padrão (ex: mudar 18:00 pra 19:00) apagava só a REGRA antiga, não
  // os horários já gerados a partir dela — eles ficavam órfãos na lista
  // de avulsos (sem o rótulo "Do padrão", já que nenhuma regra ativa mais
  // casa com eles), em vez de sumir junto com a edição. Bug real, achado
  // testando o cenário de editar um padrão de ponta a ponta.
  const { data: regrasAntigas } = grupoIdExistente
    ? await supabase
        .from("recurring_availability")
        .select("dia_semana, hora_inicio")
        .eq("professional_id", professionalId)
        .eq("grupo_id", grupoIdExistente)
    : { data: null };

  if (grupoIdExistente) {
    await supabase
      .from("recurring_availability")
      .delete()
      .eq("professional_id", professionalId)
      .eq("grupo_id", grupoIdExistente);
  }

  const { error } = await supabase.from("recurring_availability").insert(
    dias.map((dia_semana) => ({
      professional_id: professionalId,
      dia_semana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      service_id: serviceId,
      grupo_id: grupoId,
    }))
  );
  if (error) {
    if (error.message.includes("recurring_availability_prof_dia_hora_key")) {
      return {
        error: "Já existe um padrão começando nesse horário em algum dos dias selecionados — escolha outro horário ou edite o padrão existente.",
      };
    }
    return { error: error.message };
  }

  // Limpa os horários 'livre' órfãos das regras antigas (ver comentário
  // acima) — nunca toca em 'reservado' (agendamento real fica de pé,
  // mesma decisão de removerGrupoPadrao). Se a regra nova ainda cobrir o
  // mesmo dia+hora, renovarHorizonteDisponibilidade logo abaixo recria a
  // linha na hora — como é upsert com ignoreDuplicates, não duplica nem
  // deixa buraco vazio.
  if (regrasAntigas && regrasAntigas.length > 0) {
    const chavesAntigas = new Set(regrasAntigas.map((r) => `${r.dia_semana}|${r.hora_inicio}`));
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: futurosLivres } = await supabase
      .from("availability")
      .select("id, data, hora_inicio")
      .eq("professional_id", professionalId)
      .eq("status", "livre")
      .gte("data", hoje);
    const idsParaRemover = (futurosLivres ?? [])
      .filter((s) => {
        const diaSemana = new Date(`${s.data}T00:00:00Z`).getUTCDay();
        return chavesAntigas.has(`${diaSemana}|${s.hora_inicio}`);
      })
      .map((s) => s.id);
    if (idsParaRemover.length > 0) {
      await supabase.from("availability").delete().in("id", idsParaRemover);
    }
  }

  // Gera os horários avulsos das próximas semanas na hora — sem isso, o
  // profissional salvaria o padrão e não veria nenhum horário novo até o
  // próximo login.
  await renovarHorizonteDisponibilidade(supabase, professionalId);

  revalidatePath("/agenda");
  return { error: null };
}

// Remove só a linha de recurring_availability que colide exatamente com
// um dia_semana+hora_inicio — não o grupo inteiro (um grupo pode cobrir
// vários dias da semana no mesmo horário; só o dia em conflito precisa
// sumir pra liberar a criação de uma regra nova ali). Existe porque a
// reconstrução da grade (visual, por toque) removeu a única tela que
// permitia apagar uma regra recorrente presa — sem isso, uma regra
// "fantasma" (criada numa tentativa anterior que falhou antes de gerar
// horário visível) bloqueia pra sempre qualquer nova tentativa no mesmo
// dia+hora com "já existe um padrão", sem nenhum jeito de resolver pela
// interface. Chamada como recuperação inline logo depois desse erro
// específico (ver grade-semanal.tsx), não como gestão geral de padrões.
export async function removerRegraRecorrente(formData: FormData) {
  const supabase = await createClient();
  const { id: professionalId } = await getOwnProfessional(supabase);

  const diaSemana = Number(formData.get("dia_semana"));
  const horaInicio = String(formData.get("hora_inicio") ?? "");
  if (!(diaSemana >= 0 && diaSemana <= 6) || !horaInicio) {
    throw new Error("Dados inválidos pra remover a regra.");
  }

  const { error } = await supabase
    .from("recurring_availability")
    .delete()
    .eq("professional_id", professionalId)
    .eq("dia_semana", diaSemana)
    .eq("hora_inicio", horaInicio);
  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
}

const LIMITE_DIAS_EXCECAO = 60;

// Bloqueia um dia ou um período mesmo dentro do padrão ("toda segunda,
// exceto 28/07" ou "de 10/08 a 20/08, estou de férias"). Data fim é
// opcional — vazia significa bloqueio de um dia só. Apaga na hora
// qualquer horário 'livre' já gerado dentro do período — nunca toca em
// 'bloqueado' (agendamento real já confirmado continua de pé, intacto;
// ver bookings_block_availability na migration 0008). A exceção também
// impede a geração automática de recriar horário nessas datas no futuro
// (ver recurring.ts). Retorna { error } em vez de lançar — mesmo motivo
// de adicionarDisponibilidade: Next.js redacta mensagem de erro lançada
// por Server Action em produção.
export async function adicionarExcecao(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { id: professionalId } = await getOwnProfessional(supabase);

  const dataInicio = String(formData.get("data_inicio") ?? "");
  const dataFimInput = String(formData.get("data_fim") ?? "");
  const dataFim = dataFimInput || dataInicio;

  if (!dataInicio) return { error: "Escolha uma data." };
  if (dataFim < dataInicio) return { error: "A data final não pode ser antes da inicial." };

  const datas: string[] = [];
  let cursor = new Date(`${dataInicio}T00:00:00Z`);
  const fim = new Date(`${dataFim}T00:00:00Z`);
  while (cursor.getTime() <= fim.getTime()) {
    if (datas.length >= LIMITE_DIAS_EXCECAO) {
      return { error: `Selecione um período de até ${LIMITE_DIAS_EXCECAO} dias.` };
    }
    datas.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  const { error } = await supabase
    .from("availability_exceptions")
    .upsert(
      datas.map((data) => ({ professional_id: professionalId, data })),
      { onConflict: "professional_id,data", ignoreDuplicates: true }
    );
  if (error) return { error: error.message };

  await supabase
    .from("availability")
    .delete()
    .eq("professional_id", professionalId)
    .eq("status", "livre")
    .gte("data", dataInicio)
    .lte("data", dataFim);

  revalidatePath("/agenda");
  return { error: null };
}

// Remove um período inteiro de exceção de uma vez (a lista já agrupa
// datas consecutivas em um único bloco visual — ver
// agruparExcecoesConsecutivas em shared.ts — então "desbloquear" precisa
// apagar o intervalo todo, não uma linha por vez).
export async function removerExcecao(formData: FormData) {
  const supabase = await createClient();
  const { id: professionalId } = await getOwnProfessional(supabase);

  const dataInicio = String(formData.get("data_inicio") ?? "");
  const dataFim = String(formData.get("data_fim") ?? "");
  if (!dataInicio || !dataFim) throw new Error("Período inválido.");

  const { error } = await supabase
    .from("availability_exceptions")
    .delete()
    .eq("professional_id", professionalId)
    .gte("data", dataInicio)
    .lte("data", dataFim);
  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
}

export async function confirmarAgendamento(formData: FormData) {
  const supabase = await createClient();
  const professional = await getOwnProfessional(supabase);

  const id = String(formData.get("id") ?? "");
  const { data: booking, error } = await supabase
    .from("bookings")
    .update({ status: "confirmado" })
    .eq("id", id)
    .eq("professional_id", professional.id)
    .select("cliente:clients(email, notificacoes_email)")
    .single<{ cliente: { email: string; notificacoes_email: boolean } | null }>();
  if (error) throw new Error(error.message);

  if (booking.cliente?.notificacoes_email) {
    await avisarPedidoConfirmado({
      clienteEmail: booking.cliente.email,
      professionalNome: professional.nome,
    });
  }

  revalidatePath("/agenda");
}

export async function recusarAgendamento(formData: FormData) {
  const supabase = await createClient();
  const professional = await getOwnProfessional(supabase);

  const id = String(formData.get("id") ?? "");
  const { data: booking, error } = await supabase
    .from("bookings")
    .update({ status: "recusado" })
    .eq("id", id)
    .eq("professional_id", professional.id)
    .select("cliente:clients(email, notificacoes_email)")
    .single<{ cliente: { email: string; notificacoes_email: boolean } | null }>();
  if (error) throw new Error(error.message);

  if (booking.cliente?.notificacoes_email) {
    await avisarPedidoRecusado({
      clienteEmail: booking.cliente.email,
      professionalNome: professional.nome,
    });
  }

  revalidatePath("/agenda");
}

// A janela de 30 min é reforçada pela RLS (trigger guard_booking_status_transition,
// migration 0011) — este UPDATE só é aceito pelo Postgres dentro da janela e a
// partir do status "confirmado". Não confiar só na ausência do botão na UI.
export async function reportarClienteNaoCompareceu(formData: FormData) {
  const supabase = await createClient();
  const professional = await getOwnProfessional(supabase);

  const id = String(formData.get("id") ?? "");
  const { error } = await supabase
    .from("bookings")
    .update({ status: "no_show_cliente" })
    .eq("id", id)
    .eq("professional_id", professional.id);
  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
  revalidatePath(`/agenda/${id}`);
}

export async function responderAvaliacao(formData: FormData) {
  const supabase = await createClient();
  await getOwnProfessional(supabase);

  const reviewId = String(formData.get("review_id") ?? "");
  const resposta = String(formData.get("resposta") ?? "").trim();
  if (!resposta) throw new Error("Escreva uma resposta antes de enviar.");

  const { error } = await supabase
    .from("reviews")
    .update({ resposta_profissional: resposta })
    .eq("id", reviewId);
  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
}

// Espelha avaliarSessao (src/app/minhas-reservas/actions.ts) no sentido
// inverso — profissional avalia cliente. A elegibilidade real (status
// 'confirmado', dentro de 3 dias, horário já passado) é reforçada pela
// RLS de client_reviews (migration 0024) — não confiar só na ausência do
// prompt na UI.
export async function avaliarCliente(formData: FormData) {
  const supabase = await createClient();
  await getOwnProfessional(supabase);

  const bookingId = String(formData.get("booking_id") ?? "");
  const nota = Number(formData.get("nota") ?? "0");
  const comentario = String(formData.get("comentario") ?? "").trim() || null;

  if (!(nota >= 1 && nota <= 5)) throw new Error("Escolha uma nota de 1 a 5.");

  const { error } = await supabase.from("client_reviews").insert({
    booking_id: bookingId,
    nota,
    comentario,
  });
  if (error) {
    if (error.message.includes("client_reviews_booking_id_key")) {
      throw new Error("Você já avaliou esse cliente nesse atendimento.");
    }
    throw new Error(
      "Não foi possível registrar a avaliação — a janela de 3 dias após o atendimento pode ter expirado."
    );
  }

  revalidatePath("/agenda");
  revalidatePath(`/agenda/${bookingId}`);
}
