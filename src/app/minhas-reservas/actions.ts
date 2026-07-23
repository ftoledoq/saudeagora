"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// A elegibilidade real (status = 'confirmado', dentro de 3 dias, horário já
// passado) é reforçada pela RLS de reviews (migration 0011) — este INSERT
// só é aceito pelo Postgres se o booking estiver dentro da janela. Não
// confiar só na ausência do prompt na UI.
export async function avaliarSessao(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada, entre novamente.");

  const bookingId = String(formData.get("booking_id") ?? "");
  const nota = Number(formData.get("nota") ?? "0");
  const comentario = String(formData.get("comentario") ?? "").trim() || null;

  if (!(nota >= 1 && nota <= 5)) throw new Error("Escolha uma nota de 1 a 5.");

  const { error } = await supabase.from("reviews").insert({
    booking_id: bookingId,
    nota,
    comentario,
  });
  if (error) {
    if (error.message.includes("reviews_booking_id_key")) {
      throw new Error("Essa sessão já foi avaliada.");
    }
    throw new Error(
      "Não foi possível registrar a avaliação — a janela de 3 dias após o atendimento pode ter expirado."
    );
  }

  revalidatePath("/minhas-reservas");
  revalidatePath(`/minhas-reservas/${bookingId}`);
}

// A janela de 30 min é reforçada pela RLS (trigger guard_booking_status_transition,
// migration 0011) — este UPDATE só é aceito pelo Postgres dentro da janela e a
// partir do status "confirmado". Não confiar só na ausência do botão na UI.
export async function reportarProfissionalNaoCompareceu(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada, entre novamente.");

  const bookingId = String(formData.get("booking_id") ?? "");
  const { error } = await supabase
    .from("bookings")
    .update({ status: "no_show_profissional" })
    .eq("id", bookingId);
  if (error) throw new Error(error.message);

  revalidatePath("/minhas-reservas");
  revalidatePath(`/minhas-reservas/${bookingId}`);
}
