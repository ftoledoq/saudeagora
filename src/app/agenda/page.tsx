import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  adicionarDisponibilidade,
  removerDisponibilidade,
  salvarPadraoRecorrente,
  excluirPadraoRecorrente,
  adicionarExcecao,
  removerExcecao,
  confirmarAgendamento,
  recusarAgendamento,
  reportarClienteNaoCompareceu,
  responderAvaliacao,
} from "./actions";
import { renovarHorizonteDisponibilidade } from "./recurring";
import type { Availability } from "@/types/database";
import { formatDataHora, formatData } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { TappableCard } from "@/components/tappable-card";
import { AvaliarClienteForm } from "./avaliar-cliente-form";
import {
  SERVICE_LABEL,
  STATUS_LABEL,
  STATUS_LIBERA_CHAT,
  podeReportarNoShow,
  elegívelParaAvaliarCliente,
  DIA_SEMANA_ABREV,
  ORDEM_EXIBICAO_DIAS,
  textoPadraoRecorrente,
} from "./shared";

type ReviewRow = {
  id: string;
  nota: number;
  comentario: string | null;
  resposta_profissional: string | null;
};

type BookingRow = {
  id: string;
  data_hora: string;
  status: string;
  valor: number;
  cliente: {
    id: string;
    nome: string;
    telefone: string;
    bio: string | null;
    foto_storage_key: string | null;
  } | null;
  service: { tipo: string; duracao_min: number } | null;
  endereco: {
    rua: string;
    bairro: { nome: string; cidade: string; estado: string } | null;
  } | null;
  review: ReviewRow | null;
};

export default async function AgendaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/agenda");

  const { data: professional } = await supabase
    .from("professionals")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!professional) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <h1 className="font-display text-2xl font-bold">Área do profissional</h1>
        <p className="mt-2 text-foreground/70">
          Esta área é só para profissionais cadastrados.
        </p>
      </div>
    );
  }

  // Renova o horizonte ANTES de buscar os slots abaixo — sem isso, salvar
  // um padrão novo (ou só voltar a abrir a Agenda depois de um tempo)
  // não mostraria os horários recém-gerados até o próximo carregamento.
  // Também disparada no login (src/app/login/actions.ts) — ver comentário
  // em recurring.ts sobre por que os dois pontos de entrada importam.
  await renovarHorizonteDisponibilidade(supabase, professional.id);

  const [{ data: slots }, { data: bookings }, { data: service }, { data: padrao }, { data: excecoes }] =
    await Promise.all([
      supabase
        .from("availability")
        .select("*")
        .eq("professional_id", professional.id)
        .gte("data", new Date().toISOString().slice(0, 10))
        .order("data")
        .order("hora_inicio")
        .returns<Availability[]>(),
      supabase
        .from("bookings")
        .select(
          "id, data_hora, status, valor, cliente:clients(id, nome, telefone, bio, foto_storage_key), service:services(tipo, duracao_min), endereco:addresses(rua, bairro:bairros(nome, cidade, estado)), review:reviews(id, nota, comentario, resposta_profissional)"
        )
        .eq("professional_id", professional.id)
        .order("data_hora", { ascending: true })
        .returns<BookingRow[]>(),
      supabase.from("services").select("duracao_min").eq("professional_id", professional.id).maybeSingle(),
      supabase
        .from("recurring_availability")
        .select("id, dia_semana, hora_inicio, hora_fim")
        .eq("professional_id", professional.id),
      supabase
        .from("availability_exceptions")
        .select("id, data")
        .eq("professional_id", professional.id)
        .gte("data", new Date().toISOString().slice(0, 10))
        .order("data"),
    ]);
  const duracaoServicoMin = service?.duracao_min ?? 60;

  const pendentes = (bookings ?? []).filter((b) => b.status === "solicitado");
  const outros = (bookings ?? []).filter((b) => b.status !== "solicitado");

  // Foto do cliente no pedido pendente — dá contexto pro profissional
  // antes de aceitar, mesmo raciocínio de já mostrar o perfil do
  // profissional pro cliente antes de agendar. Só busca signed URL pros
  // pedidos pendentes (é onde a decisão de aceitar/recusar acontece).
  const fotoUrlPorBooking = new Map<string, string>();
  await Promise.all(
    pendentes
      .filter((b) => b.cliente?.foto_storage_key)
      .map(async (b) => {
        const { data } = await supabase.storage
          .from("client-photos")
          .createSignedUrl(b.cliente!.foto_storage_key!, 300);
        if (data?.signedUrl) fotoUrlPorBooking.set(b.id, data.signedUrl);
      })
  );

  // Nota do cliente: só busca a partir daqui (histórico), NUNCA pro bloco
  // de pedidos pendentes acima — decisão explícita do founder de não
  // deixar a média influenciar a decisão de confirmar/recusar um pedido
  // novo. bookingsJaAvaliados sabe se cada atendimento já foi avaliado
  // (pra esconder o formulário depois de enviar); mediaPorCliente é a
  // média agregada, uma por cliente, mostrada só no histórico como contexto.
  const idsOutros = outros.map((b) => b.id);
  const { data: avaliacoesFeitas } =
    idsOutros.length > 0
      ? await supabase.from("client_reviews").select("booking_id").in("booking_id", idsOutros)
      : { data: [] as { booking_id: string }[] };
  const bookingsJaAvaliados = new Set((avaliacoesFeitas ?? []).map((a) => a.booking_id));

  const idsClientesOutros = [
    ...new Set(outros.map((b) => b.cliente?.id).filter((id): id is string => !!id)),
  ];
  const mediaPorCliente = new Map<string, { media: number | null; total: number }>();
  await Promise.all(
    idsClientesOutros.map(async (clienteId) => {
      const { data } = await supabase
        .rpc("media_avaliacoes_cliente", { p_cliente_id: clienteId })
        .maybeSingle<{ media: number | null; total: number }>();
      if (data) mediaPorCliente.set(clienteId, data);
    })
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        Sua agenda
      </span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
        Pedidos de agendamento
      </h1>
      <p className="mt-2 text-base leading-7 text-foreground/70">
        {pendentes.length} pedido(s) aguardando sua resposta.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {pendentes.length === 0 && (
          <p className="text-sm text-foreground/60">Nenhum pedido pendente agora.</p>
        )}
        {pendentes.map((b) => (
          <div key={b.id} className="rounded-2xl border border-primary bg-primary-light p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <Avatar nome={b.cliente?.nome ?? "?"} photoUrl={fotoUrlPorBooking.get(b.id) ?? null} size={44} />
                <div>
                  <p className="font-display font-semibold">{b.cliente?.nome}</p>
                  <p className="text-sm text-foreground/60">{b.cliente?.telefone}</p>
                </div>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">
                {b.service && (SERVICE_LABEL[b.service.tipo] ?? b.service.tipo)}
              </span>
            </div>
            {b.cliente?.bio && (
              <p className="mt-2 text-sm text-foreground/70">{b.cliente.bio}</p>
            )}
            <p className="mt-3 text-sm">
              {formatDataHora(b.data_hora)} · R$ {b.valor}
            </p>
            {b.endereco && (
              <p className="mt-1 text-sm text-foreground/70">
                {b.endereco.rua}
                {b.endereco.bairro &&
                  `, ${b.endereco.bairro.nome} — ${b.endereco.bairro.cidade}/${b.endereco.bairro.estado}`}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <form action={recusarAgendamento}>
                <input type="hidden" name="id" value={b.id} />
                <button
                  type="submit"
                  className="rounded-full border border-error px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-light"
                >
                  Recusar
                </button>
              </form>
              <form action={confirmarAgendamento}>
                <input type="hidden" name="id" value={b.id} />
                <button
                  type="submit"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                >
                  Confirmar
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {outros.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-lg font-semibold">Histórico</h2>
          <div className="mt-3 flex flex-col gap-3">
            {outros.map((b) => {
              const reportavel = podeReportarNoShow(b.data_hora, b.status);
              const jaAvaliouCliente = bookingsJaAvaliados.has(b.id);
              const avaliavelCliente = elegívelParaAvaliarCliente(b.data_hora, b.status, jaAvaliouCliente);
              const mediaCliente = b.cliente ? mediaPorCliente.get(b.cliente.id) : undefined;

              return (
                <TappableCard
                  key={b.id}
                  href={`/agenda/${b.id}`}
                  className="cursor-pointer rounded-xl border border-border bg-white px-4 py-3 text-sm transition-colors hover:border-primary"
                >
                  <div className="flex items-center justify-between">
                    <span>
                      {b.cliente?.nome} · {formatDataHora(b.data_hora)}
                      {/* Só aparece aqui, no histórico — nunca no bloco de
                          pedidos pendentes acima, de propósito (ver
                          comentário na busca da média). Sempre agregada,
                          nunca comentário individual. */}
                      {mediaCliente && mediaCliente.total > 0 && (
                        <span className="ml-2 text-xs font-medium text-foreground/50">
                          ★ {mediaCliente.media?.toFixed(1)} ({mediaCliente.total})
                        </span>
                      )}
                    </span>
                    <span className="text-foreground/60">
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>

                  {STATUS_LIBERA_CHAT.includes(b.status) && (
                    <Link
                      href={`/chat/${b.id}`}
                      className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                    >
                      Conversar com {b.cliente?.nome}
                    </Link>
                  )}

                  {reportavel && (
                    <form action={reportarClienteNaoCompareceu} className="mt-2">
                      <input type="hidden" name="id" value={b.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-error hover:underline"
                      >
                        Cliente não compareceu
                      </button>
                    </form>
                  )}

                  {b.review && (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="text-xs font-semibold text-primary">
                        {"★".repeat(b.review.nota)}
                        {"☆".repeat(5 - b.review.nota)}
                      </p>
                      {b.review.comentario && (
                        <p className="mt-1 text-sm text-foreground/70">
                          {b.review.comentario}
                        </p>
                      )}
                      {b.review.resposta_profissional ? (
                        <p className="mt-2 text-xs text-foreground/60">
                          <strong>Sua resposta:</strong> {b.review.resposta_profissional}
                        </p>
                      ) : (
                        <form action={responderAvaliacao} className="mt-2 flex gap-2">
                          <input type="hidden" name="review_id" value={b.review.id} />
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

                  {avaliavelCliente && <AvaliarClienteForm bookingId={b.id} />}
                </TappableCard>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="font-display text-lg font-semibold">Padrão semanal</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Defina os dias e o horário em que você atende toda semana — o
          sistema gera os horários automaticamente para as próximas 8
          semanas. Salvar um novo padrão substitui o anterior por inteiro.
        </p>

        <form
          action={salvarPadraoRecorrente}
          className="mt-4 flex flex-col gap-4 rounded-2xl border border-border bg-white p-6"
        >
          <div>
            <p className="text-sm font-medium text-foreground/80">Dias da semana</p>
            <div className="mt-2 flex gap-2">
              {ORDEM_EXIBICAO_DIAS.map((dia) => (
                <label
                  key={dia}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border text-sm font-semibold transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white"
                >
                  <input type="checkbox" name="dias" value={dia} className="sr-only" />
                  {DIA_SEMANA_ABREV[dia]}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="padrao_hora_inicio" className="text-sm font-medium text-foreground/80">
                Início
              </label>
              <input
                id="padrao_hora_inicio"
                name="hora_inicio"
                type="time"
                required
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
              />
            </div>
            <p className="pb-2.5 text-sm text-foreground/60">
              Duração: {duracaoServicoMin} min (definida no seu cadastro)
            </p>
            <button
              type="submit"
              className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Salvar padrão
            </button>
          </div>
        </form>

        {padrao && padrao.length > 0 ? (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-primary bg-primary-light px-4 py-3 text-sm">
            <span className="font-medium text-primary">{textoPadraoRecorrente(padrao)}</span>
            <form action={excluirPadraoRecorrente}>
              <button type="submit" className="text-xs font-medium text-error hover:underline">
                Encerrar padrão
              </button>
            </form>
          </div>
        ) : (
          <p className="mt-3 text-sm text-foreground/60">Nenhum padrão semanal ativo.</p>
        )}

        {padrao && padrao.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium text-foreground/80">
              Bloquear um dia específico (exceção ao padrão)
            </p>
            <form action={adicionarExcecao} className="mt-2 flex flex-wrap items-end gap-3">
              <input
                type="date"
                name="data"
                required
                min={new Date().toISOString().slice(0, 10)}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-full border border-error px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-light"
              >
                Bloquear esse dia
              </button>
            </form>

            {excecoes && excecoes.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {excecoes.map((exc) => (
                  <div
                    key={exc.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3 text-sm"
                  >
                    <span>{formatData(exc.data)} · bloqueado</span>
                    <form action={removerExcecao}>
                      <input type="hidden" name="id" value={exc.id} />
                      <button type="submit" className="text-xs font-medium text-primary hover:underline">
                        Desbloquear
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="font-display text-lg font-semibold">Horários avulsos</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Adicione horários pontuais, além (ou independente) do padrão
          semanal acima — só esses horários aparecem pro cliente na hora
          de agendar.
        </p>

        <form
          action={adicionarDisponibilidade}
          className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-white p-6"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="data" className="text-sm font-medium text-foreground/80">
              Data
            </label>
            <input
              id="data"
              name="data"
              type="date"
              required
              min={new Date().toISOString().slice(0, 10)}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="hora_inicio" className="text-sm font-medium text-foreground/80">
              Início
            </label>
            <input
              id="hora_inicio"
              name="hora_inicio"
              type="time"
              required
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          {/* "Fim" não é mais digitado — calculado no servidor a partir da
              duração do serviço (evita o bug de início/fim caindo no mesmo
              valor padrão do seletor nativo e gerando horário de duração
              zero). Só mostra pra que o profissional saiba o que está
              reservando. */}
          <p className="pb-2.5 text-sm text-foreground/60">
            Duração: {duracaoServicoMin} min (definida no seu cadastro)
          </p>
          <button
            type="submit"
            className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Adicionar
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-2">
          {(!slots || slots.length === 0) && (
            <p className="text-sm text-foreground/60">
              Nenhum horário cadastrado ainda.
            </p>
          )}
          {slots?.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3"
            >
              <span className="text-sm">
                {formatData(s.data)} · {s.hora_inicio.slice(0, 5)}–{s.hora_fim.slice(0, 5)}
              </span>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    s.status === "livre"
                      ? "bg-primary-light text-primary"
                      : "bg-border text-foreground/60"
                  }`}
                >
                  {s.status === "livre" ? "Livre" : "Reservado"}
                </span>
                {s.status === "livre" && (
                  <form action={removerDisponibilidade}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-error hover:underline"
                    >
                      Remover
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
