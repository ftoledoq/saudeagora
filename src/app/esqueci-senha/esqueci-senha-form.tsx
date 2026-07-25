"use client";

import { useActionState } from "react";
import { solicitarRedefinicaoSenha, type EsqueciSenhaFormState } from "./actions";

const initialState: EsqueciSenhaFormState = { error: null, enviado: false };

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass = "text-sm font-medium text-foreground/80";

export function EsqueciSenhaForm() {
  const [state, formAction, pending] = useActionState(solicitarRedefinicaoSenha, initialState);

  if (state.enviado) {
    return (
      <div className="rounded-lg border border-primary bg-primary-light px-4 py-3 text-sm text-primary">
        Se esse e-mail tiver uma conta, enviamos um link para redefinir a
        senha. Confira também a caixa de spam.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <div className="rounded-lg border border-error bg-error-light px-4 py-3 text-sm text-error">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelClass}>
          E-mail
        </label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar link de redefinição"}
      </button>
    </form>
  );
}
