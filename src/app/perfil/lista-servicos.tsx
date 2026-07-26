"use client";

import { useState } from "react";
import { EditarServicoForm } from "./editar-servico-form";

const SERVICE_LABEL: Record<string, string> = {
  personal_trainer: "Personal Trainer",
  massagem: "Massagem",
  pilates: "Pilates",
};

type Servico = { id: string; tipo: string; preco: number; duracao_min: number };

// Client component só pra guardar "qual linha está em edição agora" — o
// resto de /perfil continua Server Component, não precisava virar client
// só por causa disso.
export function ListaServicos({ servicos }: { servicos: Servico[] }) {
  const [editandoId, setEditandoId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {servicos.map((s) =>
        editandoId === s.id ? (
          <EditarServicoForm key={s.id} servico={s} onFechar={() => setEditandoId(null)} />
        ) : (
          <div key={s.id} className="flex items-center justify-between text-sm">
            <span className="font-medium">{SERVICE_LABEL[s.tipo] ?? s.tipo}</span>
            <div className="flex items-center gap-3">
              <span className="text-foreground/60">
                R$ {s.preco} · {s.duracao_min} min
              </span>
              <button
                type="button"
                onClick={() => setEditandoId(s.id)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Editar
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
