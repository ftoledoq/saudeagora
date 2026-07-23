import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDataHora } from "@/lib/format";
import { reportarProfissionalNaoCompareceu } from "../actions";
import { AvaliarForm } from "../avaliar-form";
import { ShareCardButton } from "@/components/share-card-button";
import { Avatar } from "@/components/avatar";
import {
  SERVICE_LABEL,
  STATUS_LABEL,
  STATUS_LIBERA_CHAT,
  classeBadgeStatus,
  elegívelParaAvaliar,
  elegívelParaCompartilhar,
  podeReportarNoShow,
} from "../shared";

type BookingDetail = {
  id: string;
  data_hora: string;
  status: string;
  valor: number;
  professional_id: string;
  service: { tipo: string } | null;
  endereco: {
    rua: string;
    bairro: { nome: string; cidade: string; estado: string } | null;
  } | null;
  review: { id: string; nota: number; comentario: string | null } | null;
};

export default async function DetalheReservaPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/minhas-reservas/${bookingId}`);

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!client) notFound();

  // Mesmo raciocínio da lista (page.tsx): não dá pra fazer nested embed
  // direto em professionals, só na view professionais_publicos — busca
  // separada e junta em JS.
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, data_hora, status, valor, professional_id, service:services(tipo), endereco:addresses(rua, bairro:bairros(nome, cidade, estado)), review:reviews(id, nota, comentario)"
    )
    .eq("id", bookingId)
    .eq("cliente_id", client.id)
    .maybeSingle<BookingDetail>();

  if (!booking) notFound();

  const { data: professional } = await supabase
    .from("professionais_publicos")
    .select("id, nome, foto_storage_key")
    .eq("id", booking.professional_id)
    .maybeSingle();

  const nomeProfissional = professional?.nome ?? "Profissional";

  let fotoUrl: string | null = null;
  if (professional?.foto_storage_key) {
    const { data } = await supabase.storage
      .from("professional-documents")
      .createSignedUrl(professional.foto_storage_key, 300);
    fotoUrl = data?.signedUrl ?? null;
  }

  const avaliavel = elegívelParaAvaliar(booking.data_hora, booking.status, !!booking.review);
  const reportavel = podeReportarNoShow(booking.data_hora, booking.status);
  const compartilhavel = elegívelParaCompartilhar(booking.data_hora, booking.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/minhas-reservas" className="text-sm font-medium text-foreground/60 hover:underline">
        ‹ Minhas reservas
      </Link>

      <div className="mt-4 rounded-2xl border border-border bg-white p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar nome={nomeProfissional} photoUrl={fotoUrl} size={56} />
            <div>
              <p className="font-display text-lg font-semibold">{nomeProfissional}</p>
              <p className="text-sm text-foreground/60">
                {booking.service && (SERVICE_LABEL[booking.service.tipo] ?? booking.service.tipo)}
              </p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classeBadgeStatus(booking.status)}`}>
            {STATUS_LABEL[booking.status] ?? booking.status}
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-border pt-5 text-sm">
          <p>
            <strong>Data e horário:</strong> {formatDataHora(booking.data_hora)}
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
            Conversar com {nomeProfissional}
          </a>
        )}

        {reportavel && (
          <form action={reportarProfissionalNaoCompareceu} className="mt-4">
            <input type="hidden" name="booking_id" value={booking.id} />
            <button type="submit" className="text-xs font-medium text-error hover:underline">
              Profissional não compareceu
            </button>
          </form>
        )}

        {compartilhavel && booking.service && (
          <ShareCardButton
            profissionalNome={nomeProfissional}
            servicoTipo={booking.service.tipo}
            dataHoraIso={booking.data_hora}
          />
        )}

        {booking.review ? (
          <p className="mt-5 border-t border-border pt-5 text-sm text-foreground/60">
            Sua avaliação: {"★".repeat(booking.review.nota)}
            {"☆".repeat(5 - booking.review.nota)}
            {booking.review.comentario && ` — ${booking.review.comentario}`}
          </p>
        ) : (
          avaliavel && <AvaliarForm bookingId={booking.id} />
        )}
      </div>
    </div>
  );
}
