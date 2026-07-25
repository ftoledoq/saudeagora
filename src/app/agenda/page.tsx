import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotaoConversar } from "@/components/botao-conversar";
import {
  removerExcecao,
  confirmarAgendamento,
  recusarAgendamento,
  reportarClienteNaoCompareceu,
  responderAvaliacao,
} from "./actions";
import { renovarHorizonteDisponibilidade } from "./recurring";
import type { Availability } from "@/types/database";
import { formatDataHora, formatData, componentesDataHoraSP } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { TappableCard } from "@/components/tappable-card";
import { AvaliarClienteForm } from "./avaliar-cliente-form";
import { BloquearExcecaoForm } from "./bloquear-excecao-form";
import { GradeSemanal, type CelulaOcupada } from "./grade-semanal";
import {
  segundaDaSemana,
  diasDaSemana,
  somarDias,
  calcularFaixaHoras,
  linhasQueOBlocoOcupa,
  chaveCelula,
  rotuloSemana,
} from "./grade-helpers";
import {
  SERVICE_LABEL,
  STATUS_LABEL,
  STATUS_LIBERA_CHAT,
  podeReportarNoShow,
  elegívelParaAvaliarCliente,
  agruparExcecoesConsecutivas,
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

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { semana } = await searchParams;
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

  // Renova o horizonte ANTES de buscar os slots abaixo — sem isso, marcar
  // um padrão novo (ou só voltar a abrir a Agenda depois de um tempo) não
  // mostraria os horários recém-gerados até o próximo carregamento.
  // Também disparada no login (src/app/login/actions.ts) — ver comentário
  // em recurring.ts sobre por que os dois pontos de entrada importam.
  await renovarHorizonteDisponibilidade(supabase, professional.id);

  const hojeIso = new Date().toISOString().slice(0, 10);
  const semanaAtualInicio = segundaDaSemana(hojeIso);
  // Nunca deixa navegar pra antes da semana atual — disponibilidade
  // passada não faz sentido editar, e evita o link "semana anterior"
  // levar pra um estado sem ação nenhuma possível.
  const semanaPedida =
    semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) ? segundaDaSemana(semana) : semanaAtualInicio;
  const semanaInicio = semanaPedida < semanaAtualInicio ? semanaAtualInicio : semanaPedida;
  const diasIso = diasDaSemana(semanaInicio);
  const semanaFim = diasIso[6];

  const [
    { data: disponibilidadeSemana },
    { data: horariosFuturos },
    { data: bookings },
    { data: servicos },
    { data: padrao },
    { data: excecoes },
  ] = await Promise.all([
    supabase
      .from("availability")
      .select("*")
      .eq("professional_id", professional.id)
      .gte("data", semanaInicio)
      .lte("data", semanaFim)
      .returns<Availability[]>(),
    // Só hora_inicio, de todo o horizonte futuro (não só a semana em
    // vista) — usado pra calcular a faixa de horas da grade (ver
    // calcularFaixaHoras), que fica estável ao navegar entre semanas em
    // vez de esticar/encolher a cada troca.
    supabase
      .from("availability")
      .select("hora_inicio")
      .eq("professional_id", professional.id)
      .gte("data", hojeIso),
    supabase
      .from("bookings")
      .select(
        "id, data_hora, status, valor, cliente:clients(id, nome, telefone, bio, foto_storage_key), service:services(tipo, duracao_min), endereco:addresses(rua, bairro:bairros(nome, cidade, estado)), review:reviews(id, nota, comentario, resposta_profissional)"
      )
      .eq("professional_id", professional.id)
      .order("data_hora", { ascending: true })
      .returns<BookingRow[]>(),
    // Todos os serviços do profissional, não mais .maybeSingle() num só
    // — bug de arquitetura real corrigido (migration 0027): o modelo
    // sempre suportou múltiplos serviços com durações diferentes.
    supabase
      .from("services")
      .select("id, tipo, duracao_min")
      .eq("professional_id", professional.id)
      .order("created_at"),
    supabase
      .from("recurring_availability")
      .select("hora_inicio")
      .eq("professional_id", professional.id),
    supabase
      .from("availability_exceptions")
      .select("id, data")
      .eq("professional_id", professional.id)
      .gte("data", hojeIso)
      .order("data"),
  ]);

  const { horaMin, horaMax } = calcularFaixaHoras([
    ...(padrao ?? []).map((p) => Number(p.hora_inicio.slice(0, 2))),
    ...(horariosFuturos ?? []).map((h) => Number(h.hora_inicio.slice(0, 2))),
  ]);

  // Nome do cliente por horário reservado (só pro que aparece nesta
  // semana) — mesmo fuso já tratado em componentesDataHoraSP, nunca ler
  // o componente UTC cru do timestamptz.
  const nomeClientePorChave = new Map<string, string>();
  for (const b of bookings ?? []) {
    const { data, hora } = componentesDataHoraSP(b.data_hora);
    if (data >= semanaInicio && data <= semanaFim) {
      nomeClientePorChave.set(chaveCelula(data, hora), b.cliente?.nome ?? "Cliente");
    }
  }

  const celulas: Record<string, CelulaOcupada> = {};
  const celulasCobertas: string[] = [];
  for (const slot of disponibilidadeSemana ?? []) {
    const horaInicio = slot.hora_inicio.slice(0, 5);
    const horaFim = slot.hora_fim.slice(0, 5);
    const chave = chaveCelula(slot.data, horaInicio);
    celulas[chave] = {
      id: slot.id,
      serviceId: slot.service_id ?? "",
      status: slot.status,
      horaInicio,
      horaFim,
      clienteNome: slot.status === "bloqueado" ? nomeClientePorChave.get(chave) : undefined,
    };
    const linhas = linhasQueOBlocoOcupa(horaInicio, horaFim);
    const horaInicioNum = Number(horaInicio.slice(0, 2));
    for (let i = 1; i < linhas; i++) {
      celulasCobertas.push(chaveCelula(slot.data, `${String(horaInicioNum + i).padStart(2, "0")}:00`));
    }
  }

  const semanaAnteriorIso = somarDias(semanaInicio, -7);
  const hrefSemanaAnterior =
    semanaAnteriorIso >= semanaAtualInicio ? `/agenda?semana=${semanaAnteriorIso}` : null;
  const hrefSemanaProxima = `/agenda?semana=${somarDias(semanaInicio, 7)}`;

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

  // bookingsJaAvaliados sabe se cada atendimento já foi avaliado (pra
  // esconder o formulário de avaliação depois de enviar). A média
  // agregada de nota do cliente NÃO é buscada nem mostrada aqui — mora
  // só no /perfil do próprio cliente (ver decisão de exibição: "apenas
  // nos respectivos perfis").
  const idsOutros = outros.map((b) => b.id);
  const { data: avaliacoesFeitas } =
    idsOutros.length > 0
      ? await supabase.from("client_reviews").select("booking_id").in("booking_id", idsOutros)
      : { data: [] as { booking_id: string }[] };
  const bookingsJaAvaliados = new Set((avaliacoesFeitas ?? []).map((a) => a.booking_id));

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

              return (
                <TappableCard
                  key={b.id}
                  href={`/agenda/${b.id}`}
                  className="cursor-pointer rounded-xl border border-border bg-white px-4 py-3 text-sm transition-colors hover:border-primary"
                >
                  <div className="flex items-center justify-between">
                    <span>
                      {b.cliente?.nome} · {formatDataHora(b.data_hora)}
                    </span>
                    <span className="text-foreground/60">
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>

                  {STATUS_LIBERA_CHAT.includes(b.status) && (
                    <BotaoConversar bookingId={b.id} nome={b.cliente?.nome} className="mt-2" />
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
        <h2 className="font-display text-lg font-semibold">Sua disponibilidade</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Toque um horário livre pra marcar disponibilidade, ou num já
          marcado pra desmarcar. Horários já reservados aparecem em cinza.
        </p>

        <div className="mt-4">
          <GradeSemanal
            servicos={(servicos ?? []).map((s) => ({ id: s.id, tipo: s.tipo, duracao_min: s.duracao_min }))}
            diasIso={diasIso}
            horaMin={horaMin}
            horaMax={horaMax}
            celulas={celulas}
            celulasCobertas={celulasCobertas}
            hrefSemanaAnterior={hrefSemanaAnterior}
            hrefSemanaProxima={hrefSemanaProxima}
            rotuloSemana={rotuloSemana(diasIso)}
          />
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium text-foreground/80">Bloquear um período</p>
          <BloquearExcecaoForm />

          {excecoes && excecoes.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {agruparExcecoesConsecutivas(excecoes).map((grupo) => (
                <div
                  key={grupo.inicio}
                  className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3 text-sm"
                >
                  <span>
                    {grupo.inicio === grupo.fim
                      ? formatData(grupo.inicio)
                      : `${formatData(grupo.inicio)} – ${formatData(grupo.fim)}`}{" "}
                    · bloqueado
                  </span>
                  <form action={removerExcecao}>
                    <input type="hidden" name="data_inicio" value={grupo.inicio} />
                    <input type="hidden" name="data_fim" value={grupo.fim} />
                    <button type="submit" className="text-xs font-medium text-primary hover:underline">
                      Desbloquear
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
