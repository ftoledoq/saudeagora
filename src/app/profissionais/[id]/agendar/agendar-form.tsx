"use client";

import { useActionState, useState } from "react";
import { criarAgendamento, type AgendarFormState } from "./actions";
import type { Availability, Bairro } from "@/types/database";

const SERVICE_LABEL: Record<string, string> = {
  personal_trainer: "Personal Trainer",
  massagem: "Massagem",
  pilates: "Pilates",
};

const initialState: AgendarFormState = { error: null };
const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass = "text-sm font-medium text-foreground/80";

export function AgendarForm({
  professionalId,
  professionalNome,
  servico,
  slots,
  bairros,
}: {
  professionalId: string;
  professionalNome: string;
  servico: { id: string; tipo: string; preco: number; duracao_min: number };
  slots: Availability[];
  bairros: Bairro[];
}) {
  const [state, formAction, pending] = useActionState(criarAgendamento, initialState);
  const [slotId, setSlotId] = useState<string>("");

  const slotEscolhido = slots.find((s) => s.id === slotId);
  // -03:00 explícito: sem isso, o Postgres assume UTC pro horário que o
  // profissional digitou pensando em horário de Brasília — 3h de
  // desencontro real, não só de exibição. Região piloto inteira (RJ+SP)
  // está no mesmo fuso, sem horário de verão desde 2019.
  const dataHoraIso = slotEscolhido
    ? `${slotEscolhido.data}T${slotEscolhido.hora_inicio}-03:00`
    : "";

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
          <div className="mt-4 flex flex-wrap gap-2">
            {slots.map((s) => (
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
                {s.data} · {s.hora_inicio.slice(0, 5)}
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="font-display text-lg font-semibold">Endereço de atendimento</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rua" className={labelClass}>
              Rua
            </label>
            <input id="rua" name="rua" required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bairro_id" className={labelClass}>
              Bairro
            </label>
            <select id="bairro_id" name="bairro_id" required className={inputClass} defaultValue="">
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
            <input id="referencia" name="referencia" className={inputClass} />
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
                ? `${slotEscolhido.data} às ${slotEscolhido.hora_inicio.slice(0, 5)}`
                : "Escolha um horário acima"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground/70">Valor</dt>
            <dd className="font-display font-semibold text-primary">R$ {servico.preco}</dd>
          </div>
        </dl>
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
