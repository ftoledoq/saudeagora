"use client";

import { useActionState } from "react";
import { adicionarDisponibilidade } from "./actions";
import { SERVICE_LABEL } from "./shared";

type Servico = { id: string; tipo: string; duracao_min: number };

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
export function AdicionarDisponibilidadeForm({ servicos }: { servicos: Servico[] }) {
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
          placeholder="08:00"
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
      </div>
      {/* "Fim" não é mais digitado — calculado no servidor a partir da
          duração do SERVIÇO ESCOLHIDO (nunca de um valor único do
          profissional — bug de arquitetura real: o modelo sempre suportou
          múltiplos serviços com durações diferentes). Seletor só aparece
          quando há mais de um serviço — com um só, a escolha é automática
          e sem campo visível, sem burocracia extra pro caso comum. */}
      {servicos.length > 1 ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="avulso_service_id" className="text-sm font-medium text-foreground/80">
            Serviço
          </label>
          <select
            id="avulso_service_id"
            name="service_id"
            required
            defaultValue={servicos[0]?.id}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {SERVICE_LABEL[s.tipo] ?? s.tipo} ({s.duracao_min} min)
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <input type="hidden" name="service_id" value={servicos[0]?.id ?? ""} />
          <p className="pb-2.5 text-sm text-foreground/60">
            Duração: {servicos[0]?.duracao_min ?? 0} min (definida no seu cadastro)
          </p>
        </>
      )}
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
