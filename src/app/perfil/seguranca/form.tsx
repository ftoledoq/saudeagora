"use client";

import { useActionState } from "react";
import { trocarSenha, type SegurancaFormState } from "./actions";

const initialState: SegurancaFormState = { error: null, sucesso: false };

export function TrocarSenhaForm() {
  const [state, formAction, pending] = useActionState(trocarSenha, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      {state.error && (
        <div className="rounded-lg border border-error bg-error-light px-4 py-3 text-sm text-error">
          {state.error}
        </div>
      )}
      {state.sucesso && (
        <div className="rounded-lg border border-primary bg-primary-light px-4 py-3 text-sm text-primary">
          Senha atualizada.
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nova_senha" className="text-sm font-medium text-foreground/80">
          Nova senha
        </label>
        <input
          id="nova_senha"
          name="nova_senha"
          type="password"
          required
          minLength={8}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Trocar senha"}
      </button>
    </form>
  );
}
