"use client";

import { useActionState } from "react";
import { atualizarMeusDados, type MeusDadosFormState } from "./actions";
import { Avatar } from "@/components/avatar";

const initialState: MeusDadosFormState = { error: null, success: false };
const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass = "text-sm font-medium text-foreground/80";

export function MeusDadosForm({
  tipo,
  nomeAtual,
  telefoneAtual,
  bioAtual,
  fotoUrlAtual,
}: {
  tipo: "professional" | "client";
  nomeAtual: string;
  telefoneAtual: string;
  bioAtual: string | null;
  fotoUrlAtual: string | null;
}) {
  const [state, formAction, pending] = useActionState(atualizarMeusDados, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="tipo" value={tipo} />

      {state.error && (
        <div className="rounded-lg border border-error bg-error-light px-4 py-3 text-sm text-error">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-lg border border-primary bg-primary-light px-4 py-3 text-sm text-primary">
          Dados atualizados.
        </div>
      )}

      <div className="flex items-center gap-4">
        <Avatar nome={nomeAtual} photoUrl={fotoUrlAtual} size={64} />
        <div className="flex-1">
          <label htmlFor="foto" className={labelClass}>
            Foto (opcional, JPG ou PNG até 5MB)
          </label>
          <input id="foto" name="foto" type="file" accept="image/jpeg,image/png" className={`${inputClass} mt-1.5`} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nome" className={labelClass}>
          Nome completo
        </label>
        <input id="nome" name="nome" required defaultValue={nomeAtual} className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="telefone" className={labelClass}>
          Telefone
        </label>
        <input
          id="telefone"
          name="telefone"
          required
          defaultValue={telefoneAtual}
          placeholder="(00) 00000-0000"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className={labelClass}>
          Bio (opcional)
        </label>
        <textarea id="bio" name="bio" rows={3} defaultValue={bioAtual ?? ""} className={inputClass} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
