"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { adicionarServico } from "./actions";

type State = { error: string | null; sucessoEm: number | null };
const initialState: State = { error: null, sucessoEm: null };

async function action(_prev: State, formData: FormData): Promise<State> {
  const resultado = await adicionarServico(formData);
  return { error: resultado.error, sucessoEm: resultado.error ? null : Date.now() };
}

const OPCOES_TIPO = [
  { value: "personal_trainer", label: "Personal Trainer" },
  { value: "massagem", label: "Massagem" },
  { value: "pilates", label: "Pilates" },
];

// Formulário mínimo (tipo, preço, duração) pra criar um serviço novo —
// editar preço/duração de um já existente é ListaServicos +
// EditarServicoForm; remover/reordenar continua fora do escopo (ver
// comentário em actions.ts).
export function AdicionarServicoForm() {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [aberto, setAberto] = useState(false);
  const ultimoSucesso = useRef<number | null>(null);

  useEffect(() => {
    if (state.sucessoEm && state.sucessoEm !== ultimoSucesso.current) {
      ultimoSucesso.current = state.sucessoEm;
      setAberto(false);
    }
  }, [state.sucessoEm]);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-2 text-sm font-medium text-primary hover:underline"
      >
        + Adicionar outro serviço
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-3 rounded-2xl border border-border bg-white p-4">
      {state.error && <p className="text-xs text-error">{state.error}</p>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="novo_servico_tipo" className="text-sm font-medium text-foreground/80">
          Tipo
        </label>
        <select
          id="novo_servico_tipo"
          name="tipo"
          required
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        >
          {OPCOES_TIPO.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="novo_servico_preco" className="text-sm font-medium text-foreground/80">
            Preço (R$)
          </label>
          <input
            id="novo_servico_preco"
            name="preco"
            type="number"
            min="1"
            step="0.01"
            required
            className="w-28 rounded-lg border border-border bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="novo_servico_duracao" className="text-sm font-medium text-foreground/80">
            Duração (min)
          </label>
          <input
            id="novo_servico_duracao"
            name="duracao_min"
            type="number"
            min="1"
            required
            placeholder="60"
            className="w-24 rounded-lg border border-border bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar serviço"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-full px-5 py-2 text-sm font-medium text-foreground/60 hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
