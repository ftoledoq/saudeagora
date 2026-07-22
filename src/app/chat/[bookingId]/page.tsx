import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { BotaoVoltar } from "@/components/botao-voltar";
import { formatDataHora } from "@/lib/format";
import { ChatThread } from "./chat-thread";

const SERVICE_LABEL: Record<string, string> = {
  personal_trainer: "Personal Trainer",
  massagem: "Massagem",
  pilates: "Pilates",
};

// Booking precisa ter passado por 'confirmado' pra liberar o chat (US-09) —
// mesmo conjunto de status aceito pela RLS de insert em messages
// (booking_chat_liberado, migration 0017). 'solicitado', 'recusado' e
// cancelado_* nunca liberam.
const STATUS_LIBERA_CHAT = ["confirmado", "concluido", "no_show_cliente", "no_show_profissional"];

export default async function ChatPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/chat/${bookingId}`);

  const [{ data: client }, { data: professional }] = await Promise.all([
    supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle(),
    supabase.from("professionals").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, data_hora, status, cliente_id, professional_id, service:services(tipo)")
    .eq("id", bookingId)
    .maybeSingle<{
      id: string;
      data_hora: string;
      status: string;
      cliente_id: string;
      professional_id: string;
      service: { tipo: string } | null;
    }>();

  if (!booking) notFound();

  const viewerTipo: "cliente" | "profissional" | null =
    client && booking.cliente_id === client.id
      ? "cliente"
      : professional && booking.professional_id === professional.id
        ? "profissional"
        : null;

  // Nem cliente nem profissional donos deste booking — mesmo tratamento de
  // "não encontrado" usado no resto do app pra não vazar existência do
  // registro a quem não é parte dele.
  if (!viewerTipo) notFound();

  let outraParteNome = "";
  let outraParteFotoUrl: string | null = null;

  if (viewerTipo === "cliente") {
    const { data: profissionalPublico } = await supabase
      .from("professionais_publicos")
      .select("nome, foto_storage_key")
      .eq("id", booking.professional_id)
      .maybeSingle();
    outraParteNome = profissionalPublico?.nome ?? "Profissional";
    if (profissionalPublico?.foto_storage_key) {
      const { data } = await supabase.storage
        .from("professional-documents")
        .createSignedUrl(profissionalPublico.foto_storage_key, 300);
      outraParteFotoUrl = data?.signedUrl ?? null;
    }
  } else {
    const { data: clienteRow } = await supabase
      .from("clients")
      .select("nome, foto_storage_key")
      .eq("id", booking.cliente_id)
      .maybeSingle();
    outraParteNome = clienteRow?.nome ?? "Cliente";
    if (clienteRow?.foto_storage_key) {
      const { data } = await supabase.storage
        .from("client-photos")
        .createSignedUrl(clienteRow.foto_storage_key, 300);
      outraParteFotoUrl = data?.signedUrl ?? null;
    }
  }

  const chatLiberado = STATUS_LIBERA_CHAT.includes(booking.status);

  const servicoLabel = booking.service
    ? SERVICE_LABEL[booking.service.tipo] ?? booking.service.tipo
    : null;

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-2xl flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-white px-4 py-3">
        <BotaoVoltar fallbackHref={viewerTipo === "cliente" ? "/minhas-reservas" : "/agenda"} />
        <Avatar nome={outraParteNome} photoUrl={outraParteFotoUrl} size={40} />
        <div>
          <p className="font-display font-semibold">{outraParteNome}</p>
          <p className="text-xs text-foreground/60">
            {servicoLabel} · {formatDataHora(booking.data_hora)}
          </p>
        </div>
      </div>

      {chatLiberado ? (
        <ChatThreadWrapper bookingId={booking.id} viewerTipo={viewerTipo} outraParteNome={outraParteNome} />
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <div>
            <p className="font-display font-semibold">Chat ainda não disponível</p>
            <p className="mt-2 text-sm text-foreground/60">
              O chat é liberado assim que o profissional confirma o
              agendamento. Este pedido está com status &quot;
              {booking.status}&quot;.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

async function ChatThreadWrapper({
  bookingId,
  viewerTipo,
  outraParteNome,
}: {
  bookingId: string;
  viewerTipo: "cliente" | "profissional";
  outraParteNome: string;
}) {
  const supabase = await createClient();
  const { data: mensagens } = await supabase
    .from("messages")
    .select("id, remetente_tipo, conteudo, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  return (
    <ChatThread
      bookingId={bookingId}
      viewerTipo={viewerTipo}
      outraParteNome={outraParteNome}
      mensagensIniciais={mensagens ?? []}
    />
  );
}
