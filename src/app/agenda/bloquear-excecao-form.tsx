"use client";

import { useActionState } from "react";
import { adicionarExcecao } from "./actions";
import { hojeIsoSP } from "./grade-helpers";

type State = { error: string | null };
const initialState: State = { error: null };

async function action(_prev: State, formData: FormData): Promise<State> {
  return adicionarExcecao(formData);
}

// Bug real reportado: o formulário original (um input de data + botão numa
// linha só) estourava a largura em telas estreitas, sem quebrar layout —
// cada campo agora é uma coluna própria com w-full, empilhando naturalmente
// em mobile via flex-wrap, mesmo padrão dos outros formulários da Agenda.
// Também passou a aceitar um período (Início + Fim, Fim opcional — quando
// vazio, bloqueia um dia só), não só uma data isolada.
export function BloquearExcecaoForm() {
  const [state, formAction, pending] = useActionState(action, initialState);
  const hoje = hojeIsoSP();

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-end gap-3">
      {state.error && <p className="w-full text-xs text-error">{state.error}</p>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="excecao_data_inicio" className="text-xs font-medium text-foreground/70">
          Data de início
        </label>
        <input
          id="excecao_data_inicio"
          type="date"
          name="data_inicio"
          required
          min={hoje}
          className="w-full min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="excecao_data_fim" className="text-xs font-medium text-foreground/70">
          Data de fim (opcional)
        </label>
        <input
          id="excecao_data_fim"
          type="date"
          name="data_fim"
          min={hoje}
          className="w-full min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-error px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-light disabled:opacity-60"
      >
        {pending ? "Bloqueando..." : "Bloquear"}
      </button>
    </form>
  );
}
