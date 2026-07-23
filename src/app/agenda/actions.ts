"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { avisarPedidoConfirmado, avisarPedidoRecusado } from "@/lib/email";
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

// Soma minutos a "HH:MM", sem depender de Date (evitaria o mesmo risco de
// fuso já documentado em src/lib/format.ts) — só aritmética de string.
function somarMinutos(horaInicio: string, minutos: number): string {
  const [h, m] = horaInicio.split(":").map(Number);
  const totalMin = h * 60 + m + minutos;
  const hFim = Math.floor(totalMin / 60) % 24;
  const mFim = totalMin % 60;
  return `${String(hFim).padStart(2, "0")}:${String(mFim).padStart(2, "0")}`;
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
