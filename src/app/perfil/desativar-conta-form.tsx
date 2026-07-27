"use client";

import { useState } from "react";
import { PerfilIcons } from "@/components/perfil-icons";

// Painel próprio no lugar do window.confirm() nativo (que não dá pra
// restylizar nem acrescentar um campo) — pedido explícito: botão de
// desistir mais proeminente que o de confirmar, e uma justificativa
// opcional. Nada disso é fricção artificial: continua um toque só pra
// abrir, um toque só pra confirmar, campo de texto nunca obrigatório —
// só peso visual e uma pergunta a mais, não um passo a mais (Art. 72 do
// CDC pune quem dificulta cancelamento, não quem pergunta o motivo).
export function DesativarContaForm({
  action,
  nome,
}: {
  action: (formData: FormData) => void;
  nome: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-medium transition-colors hover:bg-primary-light"
      >
        <span className="text-foreground/50">{PerfilIcons.pausar}</span>
        <span>Desativar conta</span>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/30" onClick={() => setAberto(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-white p-5 shadow-[0_-4px_16px_rgba(0,0,0,0.12)]">
            <h3 className="font-display text-base font-semibold">Desativar conta?</h3>
            <p className="mt-2 text-sm text-foreground/70">
              Sua conta fica pausada: sai da busca (se profissional) mas seus dados continuam
              salvos e você pode reativar quando quiser.
            </p>
            <form action={action}>
              <input type="hidden" name="nome" value={nome} />
              <label htmlFor="motivo_desativacao" className="mt-4 block text-xs font-medium text-foreground/60">
                Quer nos contar por quê? (opcional)
              </label>
              <textarea
                id="motivo_desativacao"
                name="motivo"
                rows={2}
                placeholder="Sua resposta nos ajuda a melhorar — mas é totalmente opcional."
                className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="flex-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
                >
                  Continuar com a conta ativa
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:border-primary"
                >
                  Desativar mesmo assim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
