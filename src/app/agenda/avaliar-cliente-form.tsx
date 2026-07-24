"use client";

import { useActionState, useState } from "react";
import { avaliarCliente } from "./actions";

type State = { error: string | null };
const initialState: State = { error: null };

async function action(_prev: State, formData: FormData): Promise<State> {
  try {
    await avaliarCliente(formData);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao avaliar." };
  }
}

export function AvaliarClienteForm({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="nota" value={nota} />

      <p className="text-xs font-medium text-foreground/70">Avaliar o cliente</p>

      {state.error && <p className="text-xs text-error">{state.error}</p>}

      <div className="flex gap-1 text-xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNota(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className={(hover || nota) >= n ? "text-primary" : "text-border"}
            aria-label={`${n} estrela(s)`}
          >
            ★
          </button>
        ))}
      </div>

      <input
        type="text"
        name="comentario"
        placeholder="Comentário (opcional)"
        className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />

      <button
        type="submit"
        disabled={pending || nota === 0}
        className="self-start rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Avaliar cliente"}
      </button>
    </form>
  );
}
