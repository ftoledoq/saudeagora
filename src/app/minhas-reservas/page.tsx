import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDataHora } from "@/lib/format";
import { reportarProfissionalNaoCompareceu } from "./actions";
import { AvaliarForm } from "./avaliar-form";
import { ShareCardButton } from "@/components/share-card-button";
import { Avatar } from "@/components/avatar";
import { TappableCard } from "@/components/tappable-card";
import {
  SERVICE_LABEL,
  STATUS_LABEL,
  STATUS_LIBERA_CHAT,
  classeBadgeStatus,
  elegívelParaAvaliar,
  elegívelParaCompartilhar,
  podeReportarNoShow,
} from "./shared";

function agora(): number {
  return Date.now();
}

// "professional" não é mais um nested embed direto de bookings->professionals
// (ver comentário na query abaixo) — vem de um join feito em JS contra a
// view pública, por isso o tipo aqui já reflete o formato final montado.
type BookingRow = {
  id: string;
  data_hora: string;
  status: string;
  valor: number;
  professional_id: string;
  professional: { id: string; nome: string; foto_storage_key: string | null } | null;
  service: { tipo: string } | null;
  review: { id: string; nota: number; comentario: string | null } | null;
};

function IconeChat() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v12H7l-3 3V4Z" />
    </svg>
  );
}

function BotaoConversar({ bookingId, nome }: { bookingId: string; nome?: string }) {
  return (
    <a
      href={`/chat/${bookingId}`}
      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary px-4 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-light"
    >
      <IconeChat />
      Conversar com {nome}
    </a>
  );
}

export default async function MinhasReservasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/minhas-reservas");

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <h1 className="font-display text-2xl font-bold">Minhas reservas</h1>
        <p className="mt-2 text-foreground/70">
          Essa área é só para clientes cadastrados.
        </p>
      </div>
    );
  }

  // Não dá pra fazer nested embed direto em professionals aqui (bookings ->
  // professionals): desde a migration 0013, não existe mais policy pública
  // ampla na tabela professionals (foi removida por vazar cpf/telefone/
  // email) — só a view professionais_publicos (colunas seguras) é
  // acessível de forma genérica. Buscar separado e juntar em JS evita
  // reabrir uma policy de SELECT ampla só pra mostrar o nome.
  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select(
      "id, data_hora, status, valor, professional_id, service:services(tipo), review:reviews(id, nota, comentario)"
    )
    .eq("cliente_id", client.id)
    .order("data_hora", { ascending: false })
    .returns<Omit<BookingRow, "professional">[]>();

  const idsProfissionais = [...new Set((bookingsRaw ?? []).map((b) => b.professional_id))];
  const { data: profissionaisPublicos } =
    idsProfissionais.length > 0
      ? await supabase
          .from("professionais_publicos")
          .select("id, nome, foto_storage_key")
          .in("id", idsProfissionais)
      : { data: [] as { id: string; nome: string; foto_storage_key: string | null }[] };
  const profissionalPorId = new Map((profissionaisPublicos ?? []).map((p) => [p.id, p]));

  const bookings: BookingRow[] = (bookingsRaw ?? []).map((b) => ({
    ...b,
    professional: profissionalPorId.has(b.professional_id)
      ? {
          id: b.professional_id,
          nome: profissionalPorId.get(b.professional_id)!.nome,
          foto_storage_key: profissionalPorId.get(b.professional_id)!.foto_storage_key,
        }
      : { id: b.professional_id, nome: "Profissional", foto_storage_key: null },
  }));

  const fotoUrlPorProfissional = new Map<string, string>();
  await Promise.all(
    (profissionaisPublicos ?? [])
      .filter((p) => p.foto_storage_key)
      .map(async (p) => {
        const { data } = await supabase.storage
          .from("professional-documents")
          .createSignedUrl(p.foto_storage_key!, 300);
        if (data?.signedUrl) fotoUrlPorProfissional.set(p.id, data.signedUrl);
      })
  );

  const agoraMs = agora();
  const proximos = (bookings ?? []).filter((b) => new Date(b.data_hora).getTime() >= agoraMs);
  const anteriores = (bookings ?? []).filter((b) => new Date(b.data_hora).getTime() < agoraMs);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        Minhas reservas
      </span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
        Seus agendamentos
      </h1>

      {proximos.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold">Próximos</h2>
          <div className="mt-3 flex flex-col gap-3">
            {proximos.map((b) => (
              <TappableCard
                key={b.id}
                href={`/minhas-reservas/${b.id}`}
                className="cursor-pointer rounded-2xl border border-border bg-white p-5 transition-colors hover:border-primary"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar
                      nome={b.professional?.nome ?? "?"}
                      photoUrl={b.professional ? fotoUrlPorProfissional.get(b.professional.id) : null}
                      size={44}
                    />
                    <div>
                      <p className="font-display font-semibold">{b.professional?.nome}</p>
                      <p className="text-sm text-foreground/60">
                        {b.service && (SERVICE_LABEL[b.service.tipo] ?? b.service.tipo)}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classeBadgeStatus(b.status)}`}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  {formatDataHora(b.data_hora)} · R$ {b.valor}
                </p>
                {STATUS_LIBERA_CHAT.includes(b.status) && (
                  <BotaoConversar bookingId={b.id} nome={b.professional?.nome} />
                )}
              </TappableCard>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="font-display text-lg font-semibold">Anteriores</h2>
        {anteriores.length === 0 && (
          <p className="mt-2 text-sm text-foreground/60">
            Nenhum agendamento anterior ainda.
          </p>
        )}
        <div className="mt-3 flex flex-col gap-3">
          {anteriores.map((b) => {
            const avaliavel = elegívelParaAvaliar(b.data_hora, b.status, !!b.review);
            const reportavel = podeReportarNoShow(b.data_hora, b.status);
            const compartilhavel = elegívelParaCompartilhar(b.data_hora, b.status);

            return (
              <TappableCard
                key={b.id}
                href={`/minhas-reservas/${b.id}`}
                className="cursor-pointer rounded-2xl border border-border bg-white p-5 transition-colors hover:border-primary"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar
                      nome={b.professional?.nome ?? "?"}
                      photoUrl={b.professional ? fotoUrlPorProfissional.get(b.professional.id) : null}
                      size={44}
                    />
                    <div>
                      <p className="font-display font-semibold">{b.professional?.nome}</p>
                      <p className="text-sm text-foreground/60">
                        {b.service && (SERVICE_LABEL[b.service.tipo] ?? b.service.tipo)}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classeBadgeStatus(b.status)}`}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  {formatDataHora(b.data_hora)} · R$ {b.valor}
                </p>

                {STATUS_LIBERA_CHAT.includes(b.status) && (
                  <BotaoConversar bookingId={b.id} nome={b.professional?.nome} />
                )}

                {reportavel && (
                  <form action={reportarProfissionalNaoCompareceu} className="mt-2">
                    <input type="hidden" name="booking_id" value={b.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-error hover:underline"
                    >
                      Profissional não compareceu
                    </button>
                  </form>
                )}

                {compartilhavel && b.professional && b.service && (
                  <ShareCardButton
                    profissionalNome={b.professional.nome}
                    servicoTipo={b.service.tipo}
                    dataHoraIso={b.data_hora}
                  />
                )}

                {b.review ? (
                  <p className="mt-3 border-t border-border pt-3 text-xs text-foreground/60">
                    Sua avaliação: {"★".repeat(b.review.nota)}
                    {"☆".repeat(5 - b.review.nota)}
                    {b.review.comentario && ` — ${b.review.comentario}`}
                  </p>
                ) : (
                  avaliavel && <AvaliarForm bookingId={b.id} />
                )}
              </TappableCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
