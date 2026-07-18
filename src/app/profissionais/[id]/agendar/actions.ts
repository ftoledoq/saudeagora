"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { avisarNovoPedido } from "@/lib/email";

export type AgendarFormState = {
  error: string | null;
};

export async function criarAgendamento(
  _prevState: AgendarFormState,
  formData: FormData
): Promise<AgendarFormState> {
  const professionalId = String(formData.get("professional_id") ?? "");
  const serviceId = String(formData.get("service_id") ?? "");
  const availabilityId = String(formData.get("availability_id") ?? "");
  const dataHora = String(formData.get("data_hora") ?? "");
  const valor = Number(formData.get("valor") ?? "0");
  const rua = String(formData.get("rua") ?? "").trim();
  const bairroId = String(formData.get("bairro_id") ?? "");
  const referencia = String(formData.get("referencia") ?? "").trim() || null;

  if (!professionalId || !serviceId || !availabilityId || !dataHora)
    return { error: "Escolha um horário disponível." };
  if (!rua) return { error: "Informe o endereço de atendimento." };
  if (!bairroId) return { error: "Selecione o bairro de atendimento." };
  if (!(valor > 0)) return { error: "Valor inválido." };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, entre novamente." };

  const { data: client } = await supabase
    .from("clients")
    .select("id, nome")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!client) return { error: "Complete seu cadastro de cliente antes de agendar." };

  // Endereço avulso do agendamento — não é o "endereço base" de ninguém,
  // só fica associado a quem criou (o cliente), igual o DER já previa.
  const { data: address, error: addressError } = await supabase
    .from("addresses")
    .insert({ user_id: user.id, rua, bairro_id: bairroId, referencia })
    .select("id")
    .single();
  if (addressError) return { error: `Não foi possível salvar o endereço: ${addressError.message}` };

  const { error: bookingError } = await supabase.from("bookings").insert({
    cliente_id: client.id,
    professional_id: professionalId,
    service_id: serviceId,
    address_id: address.id,
    data_hora: dataHora,
    valor,
  });
  if (bookingError) {
    if (bookingError.message.includes("bookings_no_conflito")) {
      return {
        error:
          "Esse horário acabou de ser reservado por outro cliente — escolha outro, por favor.",
      };
    }
    return { error: `Não foi possível criar o agendamento: ${bookingError.message}` };
  }

  // Não há SELECT direto em professionals aqui — email é uma coluna
  // sensível (migration 0013 fechou o vazamento de PII pública). A função
  // abaixo só devolve o e-mail se existir de fato um booking entre o
  // cliente autenticado e esse profissional, o que acabamos de criar.
  const { data: professionalEmail } = await supabase.rpc("professional_email_for_own_booking", {
    p_professional_id: professionalId,
  });
  if (professionalEmail) {
    await avisarNovoPedido({ professionalEmail, clienteNome: client.nome });
  }

  redirect(`/profissionais/${professionalId}/agendar/solicitado`);
}
