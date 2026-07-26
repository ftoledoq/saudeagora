"use client";

import { useActionState } from "react";
import { iniciarAtendimento, concluirAtendimento } from "./actions";

type State = { error: string | null };
const initialState: State = { error: null };

async function iniciarAction(_prev: State, formData: FormData): Promise<State> {
  return iniciarAtendimento(formData);
}

async function concluirAction(_prev: State, formData: FormData): Promise<State> {
  return concluirAtendimento(formData);
}

// Só renderizado quando podeIniciarAtendimento já deu true (ver
// agenda/[bookingId]/page.tsx) — mesmo padrão do resto da tela (botão de
// no-show, de avaliar), nunca um botão desabilitado sem explicação visível.
export function IniciarAtendimentoButton({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState(iniciarAction, initialState);

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="id" value={bookingId} />
      {state.error && <p className="mb-1.5 text-xs text-error">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Iniciando..." : "Iniciar atendimento"}
      </button>
    </form>
  );
}

export function ConcluirAtendimentoButton({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState(concluirAction, initialState);

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="id" value={bookingId} />
      {state.error && <p className="mb-1.5 text-xs text-error">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Concluindo..." : "Concluir atendimento"}
      </button>
    </form>
  );
}
