"use client";

import { useActionState, useMemo, useState } from "react";
import { criarAgendamento, type AgendarFormState } from "./actions";
import { formatData, formatDataHora, diaDoMes, diaSemanaAbrev } from "@/lib/format";
import type { Availability, Bairro } from "@/types/database";

const SERVICE_LABEL: Record<string, string> = {
  personal_trainer: "Personal Trainer",
  massagem: "Massagem",
  pilates: "Pilates",
};

const JANELA_CANCELAMENTO_GRATUITO_HORAS = 4;

const initialState: AgendarFormState = { error: null };
const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass = "text-sm font-medium text-foreground/80";

type EnderecoAnterior = { rua: string; bairroId: string; referencia: string | null };

export function AgendarForm({
  professionalId,
  professionalNome,
  servico,
  slots,
  bairros,
  enderecosAnteriores,
}: {
  professionalId: string;
  professionalNome: string;
  servico: { id: string; tipo: string; preco: number; duracao_min: number };
  slots: Availability[];
  bairros: Bairro[];
  enderecosAnteriores: EnderecoAnterior[];
}) {
  const [state, formAction, pending] = useActionState(criarAgendamento, initialState);

  // Faixa de dias primeiro, horário depois — mesmo padrão de app de
  // atendimento sob demanda (US-05 UX, item pedido depois de 1/2
  // confirmados). Datas únicas, na ordem em que já vêm do servidor
  // (por `data` crescente).
  const datasUnicas = useMemo(() => [...new Set(slots.map((s) => s.data))], [slots]);
  const [dataEscolhida, setDataEscolhida] = useState<string>(datasUnicas[0] ?? "");
  const slotsDoDia = slots.filter((s) => s.data === dataEscolhida);

  const [slotId, setSlotId] = useState<string>("");
  const slotEscolhido = slots.find((s) => s.id === slotId);

  const [rua, setRua] = useState("");
  const [bairroId, setBairroId] = useState("");
  const [referencia, setReferencia] = useState("");

  function usarEnderecoAnterior(e: EnderecoAnterior) {
    setRua(e.rua);
    setBairroId(e.bairroId);
    setReferencia(e.referencia ?? "");
  }

  // -03:00 explícito: sem isso, o Postgres assume UTC pro horário que o
  // profissional digitou pensando em horário de Brasília — 3h de
  // desencontro real, não só de exibição. Região piloto inteira (RJ+SP)
  // está no mesmo fuso, sem horário de verão desde 2019.
  const dataHoraIso = slotEscolhido
    ? `${slotEscolhido.data}T${slotEscolhido.hora_inicio}-03:00`
    : "";

  // Aviso informativo só — nenhuma ação de cancelar existe nesta fase (sem
  // pagamento pelo app, não há reembolso a calcular). Antecipa a mesma
  // janela de tempo que US-12 já define (4h), só como texto no momento da
  // confirmação, pra não prometer uma ação que o app ainda não oferece.
  const avisoCancelamento = useMemo(() => {
    if (!dataHoraIso) return null;
    const dataAtendimento = new Date(dataHoraIso);
    const limite = new Date(dataAtendimento.getTime() - JANELA_CANCELAMENTO_GRATUITO_HORAS * 60 * 60 * 1000);
    const jaPassouDoLimite = Date.now() >= limite.getTime();
    return jaPassouDoLimite
      ? "Este horário já está a menos de 4h — combine eventual cancelamento diretamente com o profissional pelo chat."
      : `Cancelamento sem custo até ${formatDataHora(limite.toISOString())} (4h antes do horário).`;
  }, [dataHoraIso]);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input type="hidden" name="professional_id" value={professionalId} />
      <input type="hidden" name="service_id" value={servico.id} />
      <input type="hidden" name="availability_id" value={slotId} />
      <input type="hidden" name="data_hora" value={dataHoraIso} />
      <input type="hidden" name="valor" value={servico.preco} />

      {state.error && (
        <div className="rounded-lg border border-error bg-error-light px-4 py-3 text-sm text-error">
          {state.error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="font-display text-lg font-semibold">Escolha um horário</h2>
        {slots.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/60">
            Nenhum horário livre no momento — volte mais tarde.
          </p>
        ) : (
          <>
            <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {datasUnicas.map((data) => {
                const ativo = data === dataEscolhida;
                return (
                  <button
                    key={data}
                    type="button"
                    onClick={() => {
                      setDataEscolhida(data);
                      setSlotId("");
                    }}
                    className={`flex shrink-0 flex-col items-center rounded-xl border px-4 py-2 text-center transition-colors ${
                      ativo
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-white text-foreground hover:border-primary"
                    }`}
                  >
                    <span className="text-base font-display font-bold leading-none">
                      {diaDoMes(data)}
                    </span>
                    <span
                      className={`mt-1 text-[11px] font-semibold uppercase tracking-wide ${
                        ativo ? "text-white/80" : "text-foreground/50"
                      }`}
                    >
                      {diaSemanaAbrev(data)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {slotsDoDia.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-light"
                >
                  <input
                    type="radio"
                    name="slot"
                    value={s.id}
                    checked={slotId === s.id}
                    onChange={() => setSlotId(s.id)}
                    className="accent-primary"
                  />
                  {s.hora_inicio.slice(0, 5)}
                </label>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="font-display text-lg font-semibold">Endereço de atendimento</h2>

        {enderecosAnteriores.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {enderecosAnteriores.map((e, i) => (
              <button
                key={i}
                type="button"
                onClick={() => usarEnderecoAnterior(e)}
                className="rounded-full border border-border bg-primary-light/40 px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary"
              >
                {e.rua}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rua" className={labelClass}>
              Rua
            </label>
            <input
              id="rua"
              name="rua"
              required
              value={rua}
              onChange={(e) => setRua(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bairro_id" className={labelClass}>
              Bairro
            </label>
            <select
              id="bairro_id"
              name="bairro_id"
              required
              value={bairroId}
              onChange={(e) => setBairroId(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Selecione o bairro
              </option>
              {bairros.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome} — {b.cidade}/{b.estado}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="referencia" className={labelClass}>
              Ponto de referência (opcional)
            </label>
            <input
              id="referencia"
              name="referencia"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-primary bg-primary-light p-6">
        <h2 className="font-display text-lg font-semibold text-primary">Resumo</h2>
        <dl className="mt-3 flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-foreground/70">Profissional</dt>
            <dd className="font-medium">{professionalNome}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground/70">Serviço</dt>
            <dd className="font-medium">{SERVICE_LABEL[servico.tipo] ?? servico.tipo}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground/70">Data/hora</dt>
            <dd className="font-medium">
              {slotEscolhido
                ? `${formatData(slotEscolhido.data)} às ${slotEscolhido.hora_inicio.slice(0, 5)}`
                : "Escolha um horário acima"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground/70">Valor</dt>
            <dd className="font-display font-semibold text-primary">R$ {servico.preco}</dd>
          </div>
        </dl>
        {avisoCancelamento && (
          <p className="mt-3 border-t border-primary/20 pt-3 text-xs text-foreground/70">
            {avisoCancelamento}
          </p>
        )}
      </section>

      <button
        type="submit"
        disabled={pending || !slotId}
        className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Confirmar solicitação"}
      </button>
    </form>
  );
}
