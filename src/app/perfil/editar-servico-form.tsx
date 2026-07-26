"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { editarServico } from "./actions";

type State = { error: string | null; sucessoEm: number | null };
const initialState: State = { error: null, sucessoEm: null };

async function action(_prev: State, formData: FormData): Promise<State> {
  const resultado = await editarServico(formData);
  return { error: resultado.error, sucessoEm: resultado.error ? null : Date.now() };
}

const inputClass = "rounded-lg border border-border bg-white px-3 py-2 text-sm";

// Só preço e duração são editáveis (ver comentário em actions.ts) — tipo
// fica fixo, mostrado como texto, não como campo. Mesmo padrão visual de
// abrir/fechar de AdicionarServicoForm, só que por linha em vez de um
// botão único no fim da lista.
export function EditarServicoForm({
  servico,
  onFechar,
}: {
  servico: { id: string; tipo: string; preco: number; duracao_min: number };
  onFechar: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const ultimoSucesso = useRef<number | null>(null);

  useEffect(() => {
    if (state.sucessoEm && state.sucessoEm !== ultimoSucesso.current) {
      ultimoSucesso.current = state.sucessoEm;
      onFechar();
    }
  }, [state.sucessoEm, onFechar]);

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-3 rounded-2xl border border-border bg-white p-4">
      <input type="hidden" name="id" value={servico.id} />
      {state.error && <p className="text-xs text-error">{state.error}</p>}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`preco-${servico.id}`} className="text-sm font-medium text-foreground/80">
            Preço (R$)
          </label>
          <input
            id={`preco-${servico.id}`}
            name="preco"
            type="number"
            min="1"
            step="0.01"
            required
            defaultValue={servico.preco}
            className={`w-28 ${inputClass}`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`duracao-${servico.id}`} className="text-sm font-medium text-foreground/80">
            Duração (min)
          </label>
          <input
            id={`duracao-${servico.id}`}
            name="duracao_min"
            type="number"
            min="1"
            required
            defaultValue={servico.duracao_min}
            className={`w-24 ${inputClass}`}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onFechar}
          className="rounded-full px-5 py-2 text-sm font-medium text-foreground/60 hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
