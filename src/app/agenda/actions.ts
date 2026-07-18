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

export async function adicionarDisponibilidade(formData: FormData) {
  const supabase = await createClient();
  const { id: professionalId } = await getOwnProfessional(supabase);

  const data = String(formData.get("data") ?? "");
  const horaInicio = String(formData.get("hora_inicio") ?? "");
  const horaFim = String(formData.get("hora_fim") ?? "");

  if (!data || !horaInicio || !horaFim) throw new Error("Preencha data e horário.");
  if (horaFim <= horaInicio) throw new Error("Horário de fim precisa ser depois do início.");

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
    .select("cliente:clients(email)")
    .single<{ cliente: { email: string } | null }>();
  if (error) throw new Error(error.message);

  if (booking.cliente) {
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
    .select("cliente:clients(email)")
    .single<{ cliente: { email: string } | null }>();
  if (error) throw new Error(error.message);

  if (booking.cliente) {
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
