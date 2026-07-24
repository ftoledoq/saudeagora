"use client";

import { useState } from "react";
import type { Bairro } from "@/types/database";

const SERVICE_LABEL: Record<string, string> = {
  personal_trainer: "Personal Trainer",
  massagem: "Massagem",
  pilates: "Pilates",
};

// Colapsado por padrão — o formulário de 6 campos sempre aberto empurrava
// a lista de resultados pra baixo da dobra e dava a impressão de que era
// preciso mexer em filtro antes de ver qualquer coisa (a lista já
// renderiza igual, sem filtro nenhum, mas visualmente não parecia). Um
// botão "Filtros" com contador de filtros ativos expande o formulário
// completo só quando tocado — o resultado nunca depende dessa interação.
export function FiltrosBusca({
  cidadesDisponiveis,
  cidadeSelecionada,
  listaBairros,
  bairroId,
  tipo,
  raioKmParam,
  precoMaxParam,
  ordenar,
  temBairroSelecionado,
  visaoAtual,
}: {
  cidadesDisponiveis: string[];
  cidadeSelecionada: string;
  listaBairros: Bairro[];
  bairroId?: string;
  tipo?: string;
  raioKmParam?: string;
  precoMaxParam?: string;
  ordenar?: string;
  temBairroSelecionado: boolean;
  visaoAtual: "lista" | "mapa";
}) {
  const filtrosAtivos = [bairroId, tipo, raioKmParam, precoMaxParam].filter(Boolean).length;
  const [aberto, setAberto] = useState(false);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium transition-colors hover:border-primary"
        aria-expanded={aberto}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        Filtros
        {filtrosAtivos > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
            {filtrosAtivos}
          </span>
        )}
        <span className={`text-foreground/40 transition-transform ${aberto ? "rotate-180" : ""}`}>▾</span>
      </button>

      {aberto && (
        <form
          method="get"
          className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-white p-4"
        >
          {/* Preserva a view (Lista/Mapa) atual ao reenviar o formulário
              de filtros — sem isso, filtrar sempre voltava pra Lista. */}
          <input type="hidden" name="visao" value={visaoAtual} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cidade" className="text-sm font-medium text-foreground/80">
              Cidade
            </label>
            <select
              id="cidade"
              name="cidade"
              defaultValue={cidadeSelecionada}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
            >
              {cidadesDisponiveis.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bairro" className="text-sm font-medium text-foreground/80">
              Bairro
            </label>
            <select
              id="bairro"
              name="bairro"
              defaultValue={bairroId ?? ""}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
            >
              <option value="">Todos em {cidadeSelecionada}</option>
              {listaBairros.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="tipo" className="text-sm font-medium text-foreground/80">
              Serviço
            </label>
            <select
              id="tipo"
              name="tipo"
              defaultValue={tipo ?? ""}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {Object.entries(SERVICE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="raio_km" className="text-sm font-medium text-foreground/80">
              Raio de busca
            </label>
            <select
              id="raio_km"
              name="raio_km"
              defaultValue={raioKmParam ?? ""}
              disabled={!temBairroSelecionado}
              title={!temBairroSelecionado ? "Selecione um bairro pra usar raio de busca" : undefined}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">Qualquer distância</option>
              <option value="2">Até 2 km</option>
              <option value="5">Até 5 km</option>
              <option value="10">Até 10 km</option>
              <option value="20">Até 20 km</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="preco_max" className="text-sm font-medium text-foreground/80">
              Preço até (R$)
            </label>
            <input
              id="preco_max"
              name="preco_max"
              type="number"
              min="1"
              defaultValue={precoMaxParam ?? ""}
              placeholder="Sem limite"
              className="w-32 rounded-lg border border-border bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ordenar" className="text-sm font-medium text-foreground/80">
              Ordenar por
            </label>
            <select
              id="ordenar"
              name="ordenar"
              defaultValue={ordenar ?? "distancia"}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
            >
              <option value="distancia">Distância</option>
              <option value="preco">Preço</option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Buscar
          </button>
        </form>
      )}
    </div>
  );
}
