"use client";

import { useActionState } from "react";
import { registrarCliente, type RegistrarFormState } from "./actions";

const initialState: RegistrarFormState = { error: null };
const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass = "text-sm font-medium text-foreground/80";

export function RegistrarForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(registrarCliente, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <div className="rounded-lg border border-error bg-error-light px-4 py-3 text-sm text-error">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nome" className={labelClass}>
          Nome completo
        </label>
        <input id="nome" name="nome" required className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="telefone" className={labelClass}>
          Telefone
        </label>
        <input id="telefone" name="telefone" required placeholder="(00) 00000-0000" className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelClass}>
          E-mail
        </label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={labelClass}>
          Senha
        </label>
        <input id="password" name="password" type="password" required minLength={8} className={inputClass} />
      </div>

      <label className="flex items-start gap-2 text-sm text-foreground/80">
        <input type="checkbox" name="aceite_termos" required className="mt-0.5 accent-primary" />
        <span>
          Li e aceito os{" "}
          <a
            href="/termos"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Termos e Políticas
          </a>{" "}
          do SaúdeAgora.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  );
}
