"use client";

import { useState } from "react";
import { desativarServico, reativarServico } from "./actions";
import { EditarServicoForm } from "./editar-servico-form";
import { ConfirmarAcaoButton } from "@/components/confirmar-acao-button";

const SERVICE_LABEL: Record<string, string> = {
  personal_trainer: "Personal Trainer",
  massagem: "Massagem",
  pilates: "Pilates",
};

type Servico = { id: string; tipo: string; preco: number; duracao_min: number; ativo: boolean };

// Client component só pra guardar "qual linha está em edição agora" — o
// resto de /perfil continua Server Component, não precisava virar client
// só por causa disso.
export function ListaServicos({
  servicos,
  futurosPorServico,
}: {
  servicos: Servico[];
  futurosPorServico: Record<string, number>;
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {servicos.map((s) => {
        if (editandoId === s.id) {
          return <EditarServicoForm key={s.id} servico={s} onFechar={() => setEditandoId(null)} />;
        }

        const futuros = futurosPorServico[s.id] ?? 0;
        const mensagemDesativar =
          futuros > 0
            ? `${SERVICE_LABEL[s.tipo] ?? s.tipo} para de aparecer pra pedido novo. Você tem ${futuros} agendamento${futuros > 1 ? "s" : ""} futuro${futuros > 1 ? "s" : ""} já marcado${futuros > 1 ? "s" : ""} desse serviço — continua${futuros > 1 ? "m" : ""} confirmado${futuros > 1 ? "s" : ""} normalmente, sem alteração. Pode reativar quando quiser. Confirmar?`
            : `${SERVICE_LABEL[s.tipo] ?? s.tipo} para de aparecer pra pedido novo. Pode reativar quando quiser. Confirmar?`;

        return (
          <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
            <span className={`font-medium ${s.ativo ? "" : "text-foreground/40"}`}>
              {SERVICE_LABEL[s.tipo] ?? s.tipo}
              {!s.ativo && <span className="ml-1.5 text-xs font-normal">(desativado)</span>}
            </span>
            <div className="flex items-center gap-3">
              <span className={s.ativo ? "text-foreground/60" : "text-foreground/30"}>
                R$ {s.preco} · {s.duracao_min} min
              </span>
              <button
                type="button"
                onClick={() => setEditandoId(s.id)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Editar
              </button>
              {s.ativo ? (
                <form action={desativarServico}>
                  <input type="hidden" name="id" value={s.id} />
                  <ConfirmarAcaoButton
                    mensagemConfirmacao={mensagemDesativar}
                    className="text-xs font-medium text-error hover:underline"
                  >
                    Desativar
                  </ConfirmarAcaoButton>
                </form>
              ) : (
                <form action={reativarServico}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="text-xs font-medium text-primary hover:underline">
                    Reativar
                  </button>
                </form>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
