"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { adicionarDisponibilidade, salvarPadraoRecorrente, removerDisponibilidade } from "./actions";
import { corServico, chaveCelula, diaSemanaDe, linhasQueOBlocoOcupa } from "./grade-helpers";
import { diaSemanaAbrev, diaDoMes } from "@/lib/format";

const SERVICE_LABEL: Record<string, string> = {
  personal_trainer: "Personal Trainer",
  massagem: "Massagem",
  pilates: "Pilates",
};

type Servico = { id: string; tipo: string; duracao_min: number };

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
  | { modo: "ver_reservado"; celula: CelulaOcupada; data: string };

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
  hrefSemanaAnterior: string | null;
  hrefSemanaProxima: string;
  rotuloSemana: string;
}) {
  const [selecao, setSelecao] = useState<Selecao>({ modo: "idle" });
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cobertasSet = new Set(celulasCobertas);
  const indicePorServico = new Map(servicos.map((s, i) => [s.id, i]));
  const horas = Array.from({ length: horaMax - horaMin + 1 }, (_, i) => horaMin + i);

  function fechar() {
    setSelecao({ modo: "idle" });
  }

  function tocarCelulaVazia(data: string, hora: string) {
    setErro(null);
    if (servicos.length > 1) {
      setSelecao({ modo: "escolher_servico", data, hora });
    } else {
      setSelecao({ modo: "confirmar_repeticao", data, hora, serviceId: servicos[0].id });
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
    startTransition(async () => {
      const fd = new FormData();
      let resultado: { error: string | null };
      if (repetir) {
        fd.append("dias", String(diaSemanaDe(data)));
        fd.append("hora_inicio", hora);
        fd.append("service_id", serviceId);
        resultado = await salvarPadraoRecorrente(fd);
      } else {
        fd.append("data", data);
        fd.append("hora_inicio", hora);
        fd.append("service_id", serviceId);
        resultado = await adicionarDisponibilidade(fd);
      }
      if (resultado.error) setErro(resultado.error);
    });
  }

  // Tocar num bloco livre já marcado remove na hora — sem confirmação
  // extra, é o próprio espírito de "tocar e alterar" pedido pra edição
  // direta na grade. Se o horário pertence a um padrão recorrente,
  // removerDisponibilidade já registra a exceção certa (mesma lógica de
  // sempre, só a interface que mudou).
  function tocarCelulaLivre(celula: CelulaOcupada) {
    setErro(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", celula.id);
      await removerDisponibilidade(fd);
    });
  }

  function tocarCelulaReservada(celula: CelulaOcupada, data: string) {
    setSelecao({ modo: "ver_reservado", celula, data });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        {hrefSemanaAnterior ? (
          <Link
            href={hrefSemanaAnterior}
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
          aria-label="Próxima semana"
          className="rounded-full border border-border p-2 text-foreground/60 transition-colors hover:border-primary hover:text-primary"
        >
          ▶
        </Link>
      </div>

      {servicos.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {servicos.map((s, i) => {
            const cor = corServico(i);
            return (
              <span key={s.id} className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
                <span className={`h-2.5 w-2.5 rounded-full ${cor.dot}`} />
                {SERVICE_LABEL[s.tipo] ?? s.tipo}
              </span>
            );
          })}
        </div>
      )}

      {erro && (
        <p className="mt-3 rounded-lg border border-error bg-error-light px-3 py-2 text-xs text-error">
          {erro}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <div
          className="grid"
          style={{ gridTemplateColumns: `52px repeat(7, minmax(84px, 1fr))` }}
        >
          <div className="sticky left-0 z-10 border-b border-r border-border bg-white" />
          {diasIso.map((data) => (
            <div key={data} className="border-b border-border bg-white px-1 py-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/50">
                {diaSemanaAbrev(data)}
              </p>
              <p className="font-display text-sm font-bold">{diaDoMes(data)}</p>
            </div>
          ))}

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

                  if (!ocupada) {
                    return (
                      <button
                        key={chave}
                        type="button"
                        disabled={pending}
                        onClick={() => tocarCelulaVazia(data, horaLabel)}
                        className="min-h-[52px] border-b border-l border-border bg-white transition-colors hover:bg-primary-light/50 disabled:opacity-50"
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
                        className="min-h-[52px] border-b border-l border-border bg-border/50 px-1.5 py-1 text-left text-[10px] font-medium leading-tight text-foreground/60"
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
            {servicos.map((s) => (
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
    </div>
  );
}
