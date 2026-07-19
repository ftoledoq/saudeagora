"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function enviarMensagem(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "");
  const conteudo = String(formData.get("conteudo") ?? "").trim();
  if (!bookingId || !conteudo) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // remetente_tipo/remetente_id nunca vêm do client — resolvidos aqui a
  // partir da sessão autenticada e da linha real do booking, a RLS
  // (messages_insert_booking_parties) revalida tudo de novo no banco.
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: professional } = await supabase
    .from("professionals")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, cliente_id, professional_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return;

  let remetente_tipo: "cliente" | "profissional" | null = null;
  let remetente_id: string | null = null;

  if (client && booking.cliente_id === client.id) {
    remetente_tipo = "cliente";
    remetente_id = client.id;
  } else if (professional && booking.professional_id === professional.id) {
    remetente_tipo = "profissional";
    remetente_id = professional.id;
  }

  if (!remetente_tipo || !remetente_id) return;

  await supabase.from("messages").insert({
    booking_id: bookingId,
    remetente_tipo,
    remetente_id,
    conteudo,
  });

  revalidatePath(`/chat/${bookingId}`);
}
