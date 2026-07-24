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

export async function adicionarDisponibilidade(formData: FormData) {
  const supabase = await createClient();
  const { id: professionalId } = await getOwnProfessional(supabase);

  const data = String(formData.get("data") ?? "");
  const horaInicio = String(formData.get("hora_inicio") ?? "");

  if (!data || !horaInicio) throw new Error("Preencha data e horário.");

  // "Fim" nunca vem do formulário (era o bug: início e fim caindo no mesmo
  // valor padrão do seletor de hora nativo, gerando horário de duração
  // zero) — é sempre calculado a partir da duração do serviço já cadastrado,
  // nunca digitado à mão.
  const { data: service } = await supabase
    .from("services")
    .select("duracao_min")
    .eq("professional_id", professionalId)
    .maybeSingle();
  if (!service) throw new Error("Cadastre seu serviço antes de adicionar disponibilidade.");

  const horaFim = somarMinutos(horaInicio, service.duracao_min);

  const { error } = await supabase.from("availability").insert({
    professional_id: professionalId,
    data,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
  });
  if (error) {
    if (error.message.includes("availability_professional_id_data_hora_inicio_key")) {
      throw new Error("Você já tem um horário cadastrado nesse dia e hora de início.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/agenda");
}

export async function removerDisponibilidade(formData: FormData) {
  const supabase = await createClient();
  const { id: professionalId } = await getOwnProfessional(supabase);

  const id = String(formData.get("id") ?? "");
  const { error } = await supabase
    .from("availability")
    .delete()
    .eq("id", id)
    .eq("professional_id", professionalId)
    .eq("status", "livre");
  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
}

// Salvar um padrão SEMPRE substitui o padrão inteiro anterior (apaga todas
// as regras antigas do profissional e insere as novas) — não existe edição
// por dia nesta fase. Simples de entender ("o que está salvo agora é a
// verdade"), e evita a ambiguidade de "o que acontece com os horários já
// gerados quando eu mudo o horário do padrão": a resposta é sempre "os já
// gerados ficam como estão, só a geração futura muda" (ver
// excluirPadraoRecorrente abaixo, mesmo raciocínio).
export async function salvarPadraoRecorrente(formData: FormData) {
  const supabase = await createClient();
  const { id: professionalId } = await getOwnProfessional(supabase);

  const dias = formData.getAll("dias").map(Number).filter((d) => d >= 0 && d <= 6);
  const horaInicio = String(formData.get("hora_inicio") ?? "");

  if (dias.length === 0) throw new Error("Selecione ao menos um dia da semana.");
  if (!horaInicio) throw new Error("Preencha o horário de início.");

  const { data: service } = await supabase
    .from("services")
    .select("duracao_min")
    .eq("professional_id", professionalId)
    .maybeSingle();
  if (!service) throw new Error("Cadastre seu serviço antes de definir um padrão.");

  const horaFim = somarMinutos(horaInicio, service.duracao_min);

  await supabase.from("recurring_availability").delete().eq("professional_id", professionalId);

  const { error } = await supabase.from("recurring_availability").insert(
    dias.map((dia_semana) => ({
      professional_id: professionalId,
      dia_semana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
    }))
  );
  if (error) throw new Error(error.message);

  // Gera os horários avulsos das próximas semanas na hora — sem isso, o
  // profissional salvaria o padrão e não veria nenhum horário novo até o
  // próximo login.
  await renovarHorizonteDisponibilidade(supabase, professionalId);

  revalidatePath("/agenda");
}

// Só para de gerar horários novos — os que já foram gerados (inclusive os
// das próximas semanas, se o horizonte já tinha sido renovado) continuam
// existindo até serem removidos manualmente, um por um, igual qualquer
// horário avulso. Decisão deliberada de não apagar em cascata: menos
// surpresa (o profissional não perde horários que um cliente já pode ter
// visto na busca sem aviso nenhum).
export async function excluirPadraoRecorrente() {
  const supabase = await createClient();
  const { id: professionalId } = await getOwnProfessional(supabase);

  const { error } = await supabase
    .from("recurring_availability")
    .delete()
    .eq("professional_id", professionalId);
  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
}

// Bloqueia uma data específica mesmo dentro do padrão ("toda segunda,
// exceto dia 28/07"). Apaga na hora qualquer horário 'livre' já gerado
// pra essa data — nunca toca em 'bloqueado' (agendamento real já
// confirmado nesse dia continua de pé, intacto; ver
// bookings_block_availability na migration 0008). A exceção também
// impede a geração automática de recriar horário nessa data no futuro
// (ver recurring.ts).
export async function adicionarExcecao(formData: FormData) {
  const supabase = await createClient();
  const { id: professionalId } = await getOwnProfessional(supabase);

  const data = String(formData.get("data") ?? "");
  if (!data) throw new Error("Escolha uma data.");

  const { error } = await supabase
    .from("availability_exceptions")
    .upsert({ professional_id: professionalId, data }, { onConflict: "professional_id,data" });
  if (error) throw new Error(error.message);

  await supabase
    .from("availability")
    .delete()
    .eq("professional_id", professionalId)
    .eq("data", data)
    .eq("status", "livre");

  revalidatePath("/agenda");
}

export async function removerExcecao(formData: FormData) {
  const supabase = await createClient();
  const { id: professionalId } = await getOwnProfessional(supabase);

  const id = String(formData.get("id") ?? "");
  const { error } = await supabase
    .from("availability_exceptions")
    .delete()
    .eq("id", id)
    .eq("professional_id", professionalId);
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
