"use client";

import { useActionState } from "react";
import Link from "next/link";
import { redefinirSenha, type RedefinirSenhaFormState } from "./actions";

const initialState: RedefinirSenhaFormState = { error: null };

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass = "text-sm font-medium text-foreground/80";

export function RedefinirSenhaForm() {
  const [state, formAction, pending] = useActionState(redefinirSenha, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <div className="rounded-lg border border-error bg-error-light px-4 py-3 text-sm text-error">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="senha" className={labelClass}>
          Nova senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmacao" className={labelClass}>
          Confirmar nova senha
        </label>
        <input
          id="confirmacao"
          name="confirmacao"
          type="password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>

      <p className="text-center text-xs text-foreground/50">
        <Link href="/login" className="hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
