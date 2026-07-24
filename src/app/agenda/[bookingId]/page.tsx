import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDataHora } from "@/lib/format";
import { reportarClienteNaoCompareceu, responderAvaliacao } from "../actions";
import { Avatar } from "@/components/avatar";
import { AvaliarClienteForm } from "../avaliar-cliente-form";
import {
  SERVICE_LABEL,
  STATUS_LABEL,
  STATUS_LIBERA_CHAT,
  podeReportarNoShow,
  elegívelParaAvaliarCliente,
} from "../shared";

type BookingDetail = {
  id: string;
  data_hora: string;
  status: string;
  valor: number;
  cliente: { id: string; nome: string; telefone: string; bio: string | null; foto_storage_key: string | null } | null;
  service: { tipo: string } | null;
  endereco: {
    rua: string;
    bairro: { nome: string; cidade: string; estado: string } | null;
  } | null;
  review: {
    id: string;
    nota: number;
    comentario: string | null;
    resposta_profissional: string | null;
  } | null;
};

export default async function DetalheAtendimentoPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/agenda/${bookingId}`);

  const { data: professional } = await supabase
    .from("professionals")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!professional) notFound();

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, data_hora, status, valor, cliente:clients(id, nome, telefone, bio, foto_storage_key), service:services(tipo), endereco:addresses(rua, bairro:bairros(nome, cidade, estado)), review:reviews(id, nota, comentario, resposta_profissional)"
    )
    .eq("id", bookingId)
    .eq("professional_id", professional.id)
    .maybeSingle<BookingDetail>();

  if (!booking) notFound();

  let fotoUrl: string | null = null;
  if (booking.cliente?.foto_storage_key) {
    const { data } = await supabase.storage
      .from("client-photos")
      .createSignedUrl(booking.cliente.foto_storage_key, 300);
    fotoUrl = data?.signedUrl ?? null;
  }

  const reportavel = podeReportarNoShow(booking.data_hora, booking.status);

  // Nota do cliente: mesma regra do que na lista (page.tsx) — nunca busca
  // nem mostra pra um pedido ainda 'solicitado', mesmo acessando esta tela
  // direto pela URL. Só depois de confirmado.
  let avaliavelCliente = false;
  let mediaCliente: { media: number | null; total: number } | null = null;
  if (booking.status !== "solicitado" && booking.cliente) {
    const [{ data: jaAvaliado }, { data: media }] = await Promise.all([
      supabase.from("client_reviews").select("id").eq("booking_id", booking.id).maybeSingle(),
      supabase
        .rpc("media_avaliacoes_cliente", { p_cliente_id: booking.cliente.id })
        .maybeSingle<{ media: number | null; total: number }>(),
    ]);
    avaliavelCliente = elegívelParaAvaliarCliente(booking.data_hora, booking.status, !!jaAvaliado);
    mediaCliente = media;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/agenda" className="text-sm font-medium text-foreground/60 hover:underline">
        ‹ Agenda
      </Link>

      <div className="mt-4 rounded-2xl border border-border bg-white p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar nome={booking.cliente?.nome ?? "?"} photoUrl={fotoUrl} size={56} />
            <div>
              <p className="font-display text-lg font-semibold">
                {booking.cliente?.nome}
                {mediaCliente && mediaCliente.total > 0 && (
                  <span className="ml-2 text-xs font-medium text-foreground/50">
                    ★ {mediaCliente.media?.toFixed(1)} ({mediaCliente.total})
                  </span>
                )}
              </p>
              <p className="text-sm text-foreground/60">
                {booking.service && (SERVICE_LABEL[booking.service.tipo] ?? booking.service.tipo)}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-border px-3 py-1 text-xs font-semibold text-foreground/70">
            {STATUS_LABEL[booking.status] ?? booking.status}
          </span>
        </div>

        {booking.cliente?.bio && (
          <p className="mt-3 text-sm text-foreground/70">{booking.cliente.bio}</p>
        )}

        <div className="mt-5 flex flex-col gap-2 border-t border-border pt-5 text-sm">
          <p>
            <strong>Data e horário:</strong> {formatDataHora(booking.data_hora)}
          </p>
          <p>
            <strong>Telefone:</strong> {booking.cliente?.telefone}
          </p>
          <p>
            <strong>Valor:</strong> R$ {booking.valor}
          </p>
          {booking.endereco && (
            <p>
              <strong>Endereço:</strong> {booking.endereco.rua}
              {booking.endereco.bairro &&
                `, ${booking.endereco.bairro.nome} — ${booking.endereco.bairro.cidade}/${booking.endereco.bairro.estado}`}
            </p>
          )}
        </div>

        {STATUS_LIBERA_CHAT.includes(booking.status) && (
          <a
            href={`/chat/${booking.id}`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-primary px-4 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-light"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16v12H7l-3 3V4Z" />
            </svg>
            Conversar com {booking.cliente?.nome}
          </a>
        )}

        {reportavel && (
          <form action={reportarClienteNaoCompareceu} className="mt-4">
            <input type="hidden" name="id" value={booking.id} />
            <button type="submit" className="text-xs font-medium text-error hover:underline">
              Cliente não compareceu
            </button>
          </form>
        )}

        {booking.review && (
          <div className="mt-5 border-t border-border pt-5">
            <p className="text-xs font-semibold text-primary">
              {"★".repeat(booking.review.nota)}
              {"☆".repeat(5 - booking.review.nota)}
            </p>
            {booking.review.comentario && (
              <p className="mt-1 text-sm text-foreground/70">{booking.review.comentario}</p>
            )}
            {booking.review.resposta_profissional ? (
              <p className="mt-2 text-xs text-foreground/60">
                <strong>Sua resposta:</strong> {booking.review.resposta_profissional}
              </p>
            ) : (
              <form action={responderAvaliacao} className="mt-2 flex gap-2">
                <input type="hidden" name="review_id" value={booking.review.id} />
                <input
                  type="text"
                  name="resposta"
                  placeholder="Responder publicamente (opcional)"
                  className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
                >
                  Enviar
                </button>
              </form>
            )}
          </div>
        )}

        {avaliavelCliente && <AvaliarClienteForm bookingId={booking.id} />}
      </div>
    </div>
  );
}
