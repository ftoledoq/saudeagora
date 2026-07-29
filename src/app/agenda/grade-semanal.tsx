"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adicionarDisponibilidade,
  salvarPadraoRecorrente,
  removerDisponibilidade,
  removerRegraRecorrente,
  adicionarExcecao,
  removerExcecao,
} from "./actions";
import {
  corServico,
  COR_RESERVADO,
  chaveCelula,
  diaSemanaDe,
  linhasQueOBlocoOcupa,
  hojeIsoSP,
} from "./grade-helpers";
import { somarMinutos } from "./shared";
import { diaSemanaAbrev, diaDoMes } from "@/lib/format";

const SERVICE_LABEL: Record<string, string> = {
  personal_trainer: "Personal Trainer",
  massagem: "Massagem",
  pilates: "Pilates",
};

const NOME_DIA_SEMANA = [
  "domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado",
];

type Servico = { id: string; tipo: string; duracao_min: number; ativo: boolean };

export type CelulaOcupada = {
  id: string;
  serviceId: string;
  status: "livre" | "bloqueado";
  horaInicio: string;
  horaFim: string;
  clienteNome?: string;
};

type Selecao =
  | { modo: "idle" }
  | { modo: "escolher_servico"; data: string; hora: string }
  | { modo: "confirmar_repeticao"; data: string; hora: string; serviceId: string }
  | { modo: "ver_reservado"; celula: CelulaOcupada; data: string }
  | { modo: "bulk_escolher_servico" }
  | { modo: "bulk_confirmar"; serviceId: string }
  | { modo: "oferecer_parar_padrao"; diaSemana: number; horaInicio: string }
  | { modo: "confirmar_bloqueio_dia"; data: string; jaBloqueado: boolean };

// Painel simples que sobe do rodapé — mesmo padrão visual já usado no
// bottom sheet de pin do mapa em /buscar (visao-busca.tsx): fundo branco,
// canto superior arredondado, sombra pra cima, sem lib de modal nova.
function PainelInferior({
  titulo,
  onFechar,
  children,
}: {
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/30" onClick={onFechar} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-white p-5 shadow-[0_-4px_16px_rgba(0,0,0,0.12)]">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-semibold">{titulo}</h3>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="text-foreground/40 hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

// Grade visual semanal — substitui completamente o antigo trio
// padrão/exceção/avulso como três formulários separados (PadraoSemanalManager
// + AdicionarDisponibilidadeForm + lista de avulsos). Reconstrução pedida
// explicitamente depois de rodadas de patch incremental na versão anterior
// — a camada de dados (grupo_id, service_id, availability_exceptions)
// continua exatamente a mesma, só a interface muda: marcar/desmarcar
// disponibilidade é direto na grade, sem fluxo separado de "editar padrão".
export function GradeSemanal({
  servicos,
  diasIso,
  horaMin,
  horaMax,
  celulas,
  celulasCobertas,
  diasBloqueados,
  hrefSemanaAnterior,
  hrefSemanaProxima,
  rotuloSemana,
}: {
  servicos: Servico[];
  diasIso: string[];
  horaMin: number;
  horaMax: number;
  celulas: Record<string, CelulaOcupada>;
  celulasCobertas: string[];
  diasBloqueados: string[];
  hrefSemanaAnterior: string | null;
  hrefSemanaProxima: string;
  rotuloSemana: string;
}) {
  const router = useRouter();
  const [selecao, setSelecao] = useState<Selecao>({ modo: "idle" });
  const [erro, setErro] = useState<string | null>(null);
  // Regra recorrente "fantasma" — sobra de uma tentativa anterior (nesta
  // sessão de testes, ou de qualquer edição futura) que criou a REGRA mas
  // nunca gerou horário visível pra ela, deixando o dia+hora pra sempre
  // rejeitado com "já existe um padrão" sem nenhuma forma de resolver.
  // Guarda o suficiente pra oferecer "remover e tentar de novo" inline no
  // lugar do erro, em vez de exigir uma tela de gestão de padrões inteira
  // só pra esse caso de recuperação.
  const [conflito, setConflito] = useState<{
    diaSemana: number;
    hora: string;
    data: string;
    serviceId: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const cobertasSet = new Set(celulasCobertas);
  const bloqueadosSet = new Set(diasBloqueados);
  const indicePorServico = new Map(servicos.map((s, i) => [s.id, i]));
  const horas = Array.from({ length: horaMax - horaMin + 1 }, (_, i) => horaMin + i);
  // Serviço desativado (ver /perfil) some dos seletores de "escolher
  // serviço" — não faz sentido criar disponibilidade nova pra algo que o
  // profissional acabou de dizer que não quer mais atender. `servicos`
  // continua com a lista INTEIRA (ativos + inativos): uma célula já
  // reservada de antes pode referenciar um serviço hoje inativo, e o
  // rótulo/cor dela ainda precisa resolver certo (ver painel
  // "ver_reservado" e a legenda logo abaixo).
  const servicosAtivos = servicos.filter((s) => s.ativo);

  function fechar() {
    setSelecao({ modo: "idle" });
  }

  // Server Action chamada direto (fora de um <form>) ainda dispara a
  // revalidação de cache que ela mesma pede via revalidatePath, mas o
  // router do navegador só busca o RSC atualizado se alguém pedir —
  // sem isso, a tela ficava "sem responder": o toque processava
  // certinho no servidor, só a tela nunca refletia. Bug real relatado
  // (toque parecia travar/não marcar nada), corrigido chamando
  // router.refresh() explicitamente depois de toda mutação.
  function tocarCelulaVazia(data: string, hora: string) {
    setErro(null);
    if (servicosAtivos.length === 0) {
      setErro("Você não tem nenhum serviço ativo — reative um serviço em Perfil antes de marcar disponibilidade.");
      return;
    }
    if (servicosAtivos.length > 1) {
      setSelecao({ modo: "escolher_servico", data, hora });
    } else {
      setSelecao({ modo: "confirmar_repeticao", data, hora, serviceId: servicosAtivos[0].id });
    }
  }

  function escolherServico(serviceId: string) {
    if (selecao.modo !== "escolher_servico") return;
    setSelecao({ modo: "confirmar_repeticao", data: selecao.data, hora: selecao.hora, serviceId });
  }

  function confirmarRepeticao(repetir: boolean) {
    if (selecao.modo !== "confirmar_repeticao") return;
    const { data, hora, serviceId } = selecao;
    fechar();
    setConflito(null);
    startTransition(async () => {
      const fd = new FormData();
      let resultado: { error: string | null };
      if (repetir) {
        fd.append("dias", String(diaSemanaDe(data)));
        fd.append("hora_inicio", hora);
        fd.append("service_id", serviceId);
        resultado = await salvarPadraoRecorrente(fd);

        // A regra recorrente só gera horário a partir de HOJE em diante
        // (renovarHorizonteDisponibilidade nunca preenche o passado) — se
        // a célula tocada é um dia desta semana que já passou (ex: hoje é
        // quinta, tocou numa segunda), a regra é criada certinho, mas a
        // própria célula tocada ficava vazia, parecendo que nada
        // aconteceu. Bug real relatado. Garante a célula tocada em si,
        // direto, além da regra — "já existe" aqui não é erro de
        // verdade (a regra recém-criada pode já ter gerado essa mesma
        // linha se a data for hoje ou futura), só ignora esse caso.
        if (!resultado.error) {
          const fdCelula = new FormData();
          fdCelula.append("data", data);
          fdCelula.append("hora_inicio", hora);
          fdCelula.append("service_id", serviceId);
          const resultadoCelula = await adicionarDisponibilidade(fdCelula);
          if (resultadoCelula.error && !resultadoCelula.error.includes("já tem um horário cadastrado")) {
            resultado = resultadoCelula;
          }
        }

        // Regra "fantasma": criada numa tentativa anterior (que nunca
        // chegou a gerar horário visível), sobra bloqueando pra sempre
        // qualquer nova tentativa nesse mesmo dia+hora. Sem recuperação
        // aqui, o único jeito de resolver era SQL direto no banco — bug
        // real relatado. Oferece "remover e tentar de novo" junto do erro.
        if (resultado.error?.includes("Já existe um padrão")) {
          setConflito({ diaSemana: diaSemanaDe(data), hora, data, serviceId });
        }
      } else {
        fd.append("data", data);
        fd.append("hora_inicio", hora);
        fd.append("service_id", serviceId);
        resultado = await adicionarDisponibilidade(fd);
      }
      if (resultado.error) setErro(resultado.error);
      router.refresh();
    });
  }

  function resolverConflito() {
    if (!conflito) return;
    const { diaSemana, hora, data, serviceId } = conflito;
    setConflito(null);
    setErro(null);
    startTransition(async () => {
      const fdRemover = new FormData();
      fdRemover.append("dia_semana", String(diaSemana));
      fdRemover.append("hora_inicio", hora);
      await removerRegraRecorrente(fdRemover);

      const fdNovo = new FormData();
      fdNovo.append("dias", String(diaSemana));
      fdNovo.append("hora_inicio", hora);
      fdNovo.append("service_id", serviceId);
      const resultado = await salvarPadraoRecorrente(fdNovo);

      if (!resultado.error) {
        const fdCelula = new FormData();
        fdCelula.append("data", data);
        fdCelula.append("hora_inicio", hora);
        fdCelula.append("service_id", serviceId);
        const resultadoCelula = await adicionarDisponibilidade(fdCelula);
        if (resultadoCelula.error && !resultadoCelula.error.includes("já tem um horário cadastrado")) {
          resultado.error = resultadoCelula.error;
        }
      }

      if (resultado.error) setErro(resultado.error);
      router.refresh();
    });
  }

  // Tocar num bloco livre já marcado remove na hora — sem confirmação
  // extra, é o próprio espírito de "tocar e alterar" pedido pra edição
  // direta na grade. Se o horário pertence a um padrão recorrente,
  // removerDisponibilidade já registra a exceção certa (mesma lógica de
  // sempre, só a interface que mudou) — mas isso só tira ESSA data, o
  // padrão continua repetindo nas semanas seguintes. Lacuna real
  // encontrada em auditoria: não existia nenhuma forma direta de parar
  // um padrão de vez a partir daqui — oferece a opção logo em seguida,
  // sem interromper a remoção em si (que já aconteceu).
  function tocarCelulaLivre(celula: CelulaOcupada) {
    setErro(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", celula.id);
      const resultado = await removerDisponibilidade(fd);
      router.refresh();
      if (resultado.regraAtiva) {
        setSelecao({
          modo: "oferecer_parar_padrao",
          diaSemana: resultado.regraAtiva.diaSemana,
          horaInicio: resultado.regraAtiva.horaInicio,
        });
      }
    });
  }

  function pararPadraoParaSempre() {
    if (selecao.modo !== "oferecer_parar_padrao") return;
    const { diaSemana, horaInicio } = selecao;
    fechar();
    startTransition(async () => {
      const fd = new FormData();
      fd.append("dia_semana", String(diaSemana));
      fd.append("hora_inicio", horaInicio);
      await removerRegraRecorrente(fd);
      router.refresh();
    });
  }

  function tocarCelulaReservada(celula: CelulaOcupada, data: string) {
    setSelecao({ modo: "ver_reservado", celula, data });
  }

  // Atalho pedido depois da grade por célula já estar no ar: bloquear o
  // dia inteiro (folga, imprevisto) exigia rolar até o formulário
  // "Bloquear um período" mais abaixo na página e digitar a mesma data que
  // já está bem na frente no cabeçalho da coluna. Tocar a própria data
  // reaproveita adicionarExcecao/removerExcecao (mesmo mecanismo do
  // formulário de período — um dia é só um período de um dia só), só muda
  // o ponto de entrada.
  function tocarCabecalhoDia(data: string) {
    setErro(null);
    setSelecao({ modo: "confirmar_bloqueio_dia", data, jaBloqueado: bloqueadosSet.has(data) });
  }

  function confirmarBloqueioDia() {
    if (selecao.modo !== "confirmar_bloqueio_dia") return;
    const { data, jaBloqueado } = selecao;
    fechar();
    startTransition(async () => {
      if (jaBloqueado) {
        try {
          const fd = new FormData();
          fd.append("data_inicio", data);
          fd.append("data_fim", data);
          await removerExcecao(fd);
        } catch (e) {
          setErro(e instanceof Error ? e.message : "Não foi possível desbloquear o dia.");
        }
      } else {
        const fd = new FormData();
        fd.append("data_inicio", data);
        const resultado = await adicionarExcecao(fd);
        if (resultado.error) setErro(resultado.error);
      }
      router.refresh();
    });
  }

  function abrirMarcarTudo() {
    setErro(null);
    if (servicosAtivos.length === 0) {
      setErro("Você não tem nenhum serviço ativo — reative um serviço em Perfil antes de marcar disponibilidade.");
      return;
    }
    if (servicosAtivos.length > 1) {
      setSelecao({ modo: "bulk_escolher_servico" });
    } else {
      setSelecao({ modo: "bulk_confirmar", serviceId: servicosAtivos[0].id });
    }
  }

  function escolherServicoBulk(serviceId: string) {
    setSelecao({ modo: "bulk_confirmar", serviceId });
  }

  // "Estou disponível o tempo todo" — pedido real depois de testar com
  // profissional que atende só pelo app: marcar célula por célula não é
  // viável pra quem quer ficar livre em toda a faixa de horas exibida.
  // Preenche só o que ainda está vazio (nunca sobrescreve reservado nem
  // já marcado), sempre a partir de HOJE em diante — nunca um dia da
  // semana atual que já passou.
  //
  // Bug real relatado: sem esse corte, um dia já passado na semana atual
  // entrava na lista de "vazios" (nenhum horário tinha sido gerado pra
  // ele, já que renovarHorizonteDisponibilidade nunca preenche o
  // passado), a regra recorrente era criada mesmo assim, mas a célula
  // continuava vazia — e ao tentar de novo, o mesmo dia+hora ainda
  // aparecia "vazio" (só que agora JÁ tinha uma regra criada da
  // tentativa anterior), disparando "já existe um padrão começando
  // nesse horário". Cortar em hoje evita as duas coisas: dia de hoje em
  // diante sempre gera a linha de verdade (renovarHorizonteDisponibilidade
  // já cobre hoje), então uma segunda tentativa nunca vê como "vazio"
  // algo que já foi preenchido.
  function confirmarBulk(repetir: boolean) {
    if (selecao.modo !== "bulk_confirmar") return;
    const { serviceId } = selecao;
    fechar();
    const hojeIso = hojeIsoSP();
    const diasAPartirDeHoje = diasIso.filter((data) => data >= hojeIso);

    // Quantas linhas de hora o serviço escolhido ocupa (serviço >60min
    // cobre mais de uma linha — ex: 90min cobre a própria hora + a
    // seguinte). cobertasSet/celulas refletem o estado ANTES desta
    // operação começar (vieram por props, no snapshot da última renderização)
    // — sozinhos não bastam pra saber que a linha seguinte, ainda "vazia"
    // nesse snapshot, está prestes a ser coberta pelo bloco desta mesma
    // hora.
    const servico = servicos.find((s) => s.id === serviceId);
    const linhasBloco = servico
      ? linhasQueOBlocoOcupa(`${String(horaMin).padStart(2, "0")}:00`, somarMinutos(`${String(horaMin).padStart(2, "0")}:00`, servico.duracao_min))
      : 1;

    // Bug real de auditoria: rodar uma chamada por hora em PARALELO (Promise.all),
    // cada uma decidindo "vazio ou não" só pelo snapshot de props, deixava
    // um serviço de mais de 1h criar dois blocos sobrepostos pro mesmo dia
    // (um pela iteração da hora de início, outro pela iteração da hora
    // seguinte, que não tinha como enxergar a escrita em andamento da
    // primeira). Um dos dois ficava "coberto" visualmente pelo outro na
    // grade, mas continuava de pé no banco — reservável pelo cliente sem
    // o profissional nunca ver ou poder remover. Corrigido calculando o
    // plano inteiro (quais dia+hora entram) de uma vez, de forma síncrona,
    // reservando as linhas que cada bloco vai ocupar ANTES de decidir a
    // próxima hora — só depois disso dispara as chamadas de verdade.
    const ocupadoNestaOperacao = new Set<string>();
    function reservar(data: string, horaInicioNum: number) {
      for (let i = 0; i < linhasBloco; i++) {
        ocupadoNestaOperacao.add(chaveCelula(data, `${String(horaInicioNum + i).padStart(2, "0")}:00`));
      }
    }
    function livre(data: string, horaLabel: string): boolean {
      const chave = chaveCelula(data, horaLabel);
      return !cobertasSet.has(chave) && !celulas[chave] && !ocupadoNestaOperacao.has(chave);
    }

    startTransition(async () => {
      let primeiroErro: string | null = null;

      if (repetir) {
        const chamadas: FormData[] = [];
        for (const h of horas) {
          const horaLabel = `${String(h).padStart(2, "0")}:00`;
          const diasLivres = diasAPartirDeHoje.filter((data) => livre(data, horaLabel));
          if (diasLivres.length === 0) continue;
          diasLivres.forEach((data) => reservar(data, h));
          const fd = new FormData();
          diasLivres.forEach((data) => fd.append("dias", String(diaSemanaDe(data))));
          fd.append("hora_inicio", horaLabel);
          fd.append("service_id", serviceId);
          chamadas.push(fd);
        }
        await Promise.all(
          chamadas.map(async (fd) => {
            const resultado = await salvarPadraoRecorrente(fd);
            if (resultado.error && !primeiroErro) primeiroErro = resultado.error;
          })
        );
      } else {
        const celulasVazias: { data: string; hora: string }[] = [];
        for (const h of horas) {
          const horaLabel = `${String(h).padStart(2, "0")}:00`;
          for (const data of diasAPartirDeHoje) {
            if (livre(data, horaLabel)) {
              reservar(data, h);
              celulasVazias.push({ data, hora: horaLabel });
            }
          }
        }
        await Promise.all(
          celulasVazias.map(async ({ data, hora }) => {
            const fd = new FormData();
            fd.append("data", data);
            fd.append("hora_inicio", hora);
            fd.append("service_id", serviceId);
            const resultado = await adicionarDisponibilidade(fd);
            if (resultado.error && !primeiroErro) primeiroErro = resultado.error;
          })
        );
      }

      if (primeiroErro) setErro(primeiroErro);
      router.refresh();
    });
  }

  return (
    <div>
      {/* prefetch={false} nos dois links de navegação de semana — bug
          real de causa raiz encontrado em auditoria: o Link pré-busca e
          cacheia a semana seguinte assim que a seta aparece na tela
          (antes de qualquer toque), automaticamente. Marcar disponibilidade
          e depois navegar pra lá podia servir esse cache pré-mutação em
          vez de buscar de novo — os dados eram gravados certinho no
          banco (confirmado: tentativas repetidas passaram a esbarrar em
          "já existe um padrão", prova de que a regra tinha sido criada
          da vez anterior), só a tela nunca refletia. Sem prefetch, cada
          clique nas setas sempre busca fresco. */}
      <div className="flex items-center justify-between gap-3">
        {hrefSemanaAnterior ? (
          <Link
            href={hrefSemanaAnterior}
            scroll={false}
            prefetch={false}
            aria-label="Semana anterior"
            className="rounded-full border border-border p-2 text-foreground/60 transition-colors hover:border-primary hover:text-primary"
          >
            ◀
          </Link>
        ) : (
          <span aria-hidden className="rounded-full border border-border p-2 text-foreground/20">
            ◀
          </span>
        )}
        <p className="text-sm font-medium capitalize">{rotuloSemana}</p>
        <Link
          href={hrefSemanaProxima}
          scroll={false}
          prefetch={false}
          aria-label="Próxima semana"
          className="rounded-full border border-border p-2 text-foreground/60 transition-colors hover:border-primary hover:text-primary"
        >
          ▶
        </Link>
      </div>

      {/* Legenda sempre visível — cobre os três estados possíveis na
          grade (serviço(s) livre(s) + reservado), não só quando há mais
          de um serviço. Antes só aparecia com 2+ serviços, deixando
          "Reservado" sem nenhuma explicação visual pra quem tem um só.
          Só serviço ATIVO aparece aqui — um desativado não tem mais
          célula livre (removida quando desativou, ver actions.ts), então
          nenhuma cor precisa de legenda pra ele. A cor vem de
          indicePorServico (posição no array INTEIRO, não o índice deste
          .filter) — senão a cor da legenda desalinha da cor da célula
          assim que um serviço no meio da lista fica inativo. */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {servicosAtivos.map((s) => {
            const cor = corServico(indicePorServico.get(s.id) ?? 0);
            return (
              <span key={s.id} className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
                <span className={`h-2.5 w-2.5 rounded-full ${cor.dot}`} />
                {SERVICE_LABEL[s.tipo] ?? s.tipo}
              </span>
            );
          })}
          <span className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
            <span className={`h-2.5 w-2.5 rounded-full ${COR_RESERVADO.bg} ring-1 ring-inset ring-gray-400`} />
            Reservado
          </span>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={abrirMarcarTudo}
          className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          Marcar semana inteira como livre
        </button>
      </div>

      {pending && (
        <p className="mt-2 text-xs text-foreground/50">Salvando...</p>
      )}

      {erro && (
        <div className="mt-3 rounded-lg border border-error bg-error-light px-3 py-2 text-xs text-error">
          <p>{erro}</p>
          {conflito && (
            <button
              type="button"
              disabled={pending}
              onClick={resolverConflito}
              className="mt-1.5 font-semibold underline disabled:opacity-50"
            >
              Remover regra existente nesse horário e aplicar este novo
            </button>
          )}
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <div
          className="grid"
          style={{ gridTemplateColumns: `52px repeat(7, minmax(84px, 1fr))` }}
        >
          <div className="sticky left-0 z-10 border-b border-r border-border bg-white" />
          {diasIso.map((data) => {
            const bloqueado = bloqueadosSet.has(data);
            return (
              <button
                key={data}
                type="button"
                disabled={pending}
                onClick={() => tocarCabecalhoDia(data)}
                title={bloqueado ? "Dia bloqueado — toque para desbloquear" : "Toque para bloquear o dia inteiro"}
                className={`border-b border-border px-1 py-2 text-center transition-colors disabled:opacity-50 ${
                  bloqueado ? "bg-error-light hover:bg-error-light/70" : "bg-white hover:bg-primary-light/50"
                }`}
              >
                <p
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    bloqueado ? "text-error" : "text-foreground/50"
                  }`}
                >
                  {diaSemanaAbrev(data)}
                </p>
                <p className={`font-display text-sm font-bold ${bloqueado ? "text-error" : ""}`}>
                  {diaDoMes(data)}
                </p>
              </button>
            );
          })}

          {horas.map((h) => {
            const horaLabel = `${String(h).padStart(2, "0")}:00`;
            return (
              <div key={`linha-${h}`} className="contents">
                <div className="sticky left-0 z-10 border-r border-border bg-white px-1.5 py-1 text-right text-[10px] text-foreground/50">
                  {horaLabel}
                </div>
                {diasIso.map((data) => {
                  const chave = chaveCelula(data, horaLabel);
                  if (cobertasSet.has(chave)) return null;

                  const ocupada = celulas[chave];
                  const diaBloqueado = bloqueadosSet.has(data);

                  // Dia bloqueado nunca tem célula "ocupada" aqui (o
                  // bloqueio já apaga os horários livres do período — ver
                  // adicionarExcecao), então toda célula vazia desse dia
                  // cai neste branch. Esmaece em vez de deixar em branco
                  // igual a um dia comum — pedido depois de testar um
                  // bloqueio de período longo, onde a semana toda ficava
                  // visualmente idêntica a "nada marcado ainda", sem dar
                  // pra distinguir de longe "bloqueado" de "esqueci de
                  // marcar". Toque aqui reabre o mesmo painel do
                  // cabeçalho (oferece desbloquear) em vez do fluxo de
                  // escolher serviço, que o servidor rejeitaria mesmo.
                  if (!ocupada) {
                    return (
                      <button
                        key={chave}
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          diaBloqueado ? tocarCabecalhoDia(data) : tocarCelulaVazia(data, horaLabel)
                        }
                        title={diaBloqueado ? "Dia bloqueado" : undefined}
                        className={`min-h-[52px] border-b border-l border-border transition-colors disabled:opacity-50 ${
                          diaBloqueado
                            ? "bg-error-light/40 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(0,0,0,0.04)_6px,rgba(0,0,0,0.04)_12px)] hover:bg-error-light/60"
                            : "bg-white hover:bg-primary-light/50"
                        }`}
                      />
                    );
                  }

                  const linhas = linhasQueOBlocoOcupa(ocupada.horaInicio, ocupada.horaFim);

                  if (ocupada.status === "bloqueado") {
                    return (
                      <button
                        key={chave}
                        type="button"
                        onClick={() => tocarCelulaReservada(ocupada, data)}
                        style={{ gridRow: `span ${linhas}` }}
                        className={`min-h-[52px] border-b border-l ${COR_RESERVADO.borda} ${COR_RESERVADO.bg} px-1.5 py-1 text-left text-[10px] font-medium leading-tight ${COR_RESERVADO.texto}`}
                      >
                        {ocupada.clienteNome ?? "Reservado"}
                      </button>
                    );
                  }

                  const cor = corServico(indicePorServico.get(ocupada.serviceId) ?? 0);
                  return (
                    <button
                      key={chave}
                      type="button"
                      disabled={pending}
                      onClick={() => tocarCelulaLivre(ocupada)}
                      style={{ gridRow: `span ${linhas}` }}
                      className={`min-h-[52px] border-b border-l ${cor.borda} ${cor.bg} px-1.5 py-1 text-left text-[10px] font-semibold leading-tight ${cor.texto} transition-opacity hover:opacity-80 disabled:opacity-50`}
                    >
                      {ocupada.horaInicio}–{ocupada.horaFim}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {selecao.modo === "escolher_servico" && (
        <PainelInferior titulo="Escolha o serviço" onFechar={fechar}>
          <div className="flex flex-wrap gap-2">
            {servicosAtivos.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => escolherServico(s.id)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-primary"
              >
                {SERVICE_LABEL[s.tipo] ?? s.tipo}
              </button>
            ))}
          </div>
        </PainelInferior>
      )}

      {selecao.modo === "confirmar_repeticao" && (
        <PainelInferior titulo="Repetir essa disponibilidade toda semana?" onFechar={fechar}>
          <p className="text-sm text-foreground/70">
            {diaSemanaAbrev(selecao.data)} {diaDoMes(selecao.data)} · {selecao.hora}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => confirmarRepeticao(true)}
              className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
            >
              Sim, toda semana
            </button>
            <button
              type="button"
              onClick={() => confirmarRepeticao(false)}
              className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary"
            >
              Só essa data
            </button>
          </div>
        </PainelInferior>
      )}

      {selecao.modo === "ver_reservado" && (
        <PainelInferior titulo="Horário reservado" onFechar={fechar}>
          <p className="text-sm font-medium">
            {selecao.celula.clienteNome ?? "Cliente"}
          </p>
          <p className="mt-1 text-sm text-foreground/60">
            {SERVICE_LABEL[servicos.find((s) => s.id === selecao.celula.serviceId)?.tipo ?? ""] ?? ""}
            {" · "}
            {diaSemanaAbrev(selecao.data)} {diaDoMes(selecao.data)} · {selecao.celula.horaInicio}–
            {selecao.celula.horaFim}
          </p>
        </PainelInferior>
      )}

      {selecao.modo === "bulk_escolher_servico" && (
        <PainelInferior titulo="Marcar semana inteira — escolha o serviço" onFechar={fechar}>
          <div className="flex flex-wrap gap-2">
            {servicosAtivos.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => escolherServicoBulk(s.id)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-primary"
              >
                {SERVICE_LABEL[s.tipo] ?? s.tipo}
              </button>
            ))}
          </div>
        </PainelInferior>
      )}

      {selecao.modo === "bulk_confirmar" && (
        <PainelInferior titulo="Repetir toda semana, sempre?" onFechar={fechar}>
          <p className="text-sm text-foreground/70">
            Preenche todo horário ainda livre de hoje até o fim desta semana
            ({rotuloSemana}), de {String(horaMin).padStart(2, "0")}:00 a{" "}
            {String(horaMax).padStart(2, "0")}:00 — sem mexer no que já está
            marcado, reservado, ou em dias que já passaram.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => confirmarBulk(true)}
              className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
            >
              Sim, toda semana
            </button>
            <button
              type="button"
              onClick={() => confirmarBulk(false)}
              className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary"
            >
              Só esta semana
            </button>
          </div>
        </PainelInferior>
      )}

      {selecao.modo === "confirmar_bloqueio_dia" && (
        <PainelInferior
          titulo={selecao.jaBloqueado ? "Desbloquear esse dia?" : "Bloquear o dia inteiro?"}
          onFechar={fechar}
        >
          <p className="text-sm text-foreground/70">
            {diaSemanaAbrev(selecao.data)} {diaDoMes(selecao.data)}
            {selecao.jaBloqueado
              ? " — você não recebe pedido nesse dia. Desbloquear libera de novo os horários do seu padrão."
              : " — nenhum horário livre desse dia fica disponível pra cliente pedir. Horários já reservados continuam de pé."}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={confirmarBloqueioDia}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 ${
                selecao.jaBloqueado ? "bg-primary" : "bg-error"
              }`}
            >
              {selecao.jaBloqueado ? "Desbloquear" : "Bloquear o dia"}
            </button>
            <button
              type="button"
              onClick={fechar}
              className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary"
            >
              Cancelar
            </button>
          </div>
        </PainelInferior>
      )}

      {selecao.modo === "oferecer_parar_padrao" && (
        <PainelInferior titulo="Parar de repetir esse horário?" onFechar={fechar}>
          <p className="text-sm text-foreground/70">
            Essa data foi removida. Esse horário também faz parte do seu
            padrão de toda {NOME_DIA_SEMANA[selecao.diaSemana]}, às{" "}
            {selecao.horaInicio} — ele vai continuar aparecendo nas próximas
            semanas até você parar de repetir.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={pararPadraoParaSempre}
              className="flex-1 rounded-full bg-error px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
            >
              Parar de repetir pra sempre
            </button>
            <button
              type="button"
              onClick={fechar}
              className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary"
            >
              Só essa data mesmo
            </button>
          </div>
        </PainelInferior>
      )}
    </div>
  );
}
