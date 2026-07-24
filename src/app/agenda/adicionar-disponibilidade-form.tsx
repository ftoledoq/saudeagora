"use client";

import { useActionState } from "react";
import { adicionarDisponibilidade } from "./actions";

type State = { error: string | null };
const initialState: State = { error: null };

async function action(_prev: State, formData: FormData): Promise<State> {
  return adicionarDisponibilidade(formData);
}

// Mesmo padrão de AvaliarForm/AvaliarClienteForm: useActionState pra
// capturar o erro e mostrar inline, em vez de deixar a Server Action
// lançar sem tratamento — o que derruba a tela inteira pra página de erro
// genérica do Next.js (bug real encontrado ao testar a exceção de
// disponibilidade recorrente: o insert era corretamente bloqueado pelo
// trigger do banco, mas a experiência virava um crash de página cheia).
export function AdicionarDisponibilidadeForm({ duracaoServicoMin }: { duracaoServicoMin: number }) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-white p-6"
    >
      {state.error && (
        <p className="w-full text-xs text-error">{state.error}</p>
      )}
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
        disabled={pending}
        className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Adicionando..." : "Adicionar"}
      </button>
    </form>
  );
}
