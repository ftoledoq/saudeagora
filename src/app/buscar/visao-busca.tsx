"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { SearchMap, type MapPin } from "@/components/map/search-map-loader";

export type CardBusca = {
  key: string;
  professionalId: string;
  nome: string;
  bairroNome: string;
  bairroCidade: string;
  bairroEstado: string;
  servicoLabel: string;
  preco: number;
  duracaoMin: number;
  distanciaLabel: string | null;
  fotoUrl: string | null;
  avaliacaoLabel: string | null;
};

// Tela 1 do wireframe: duas visões alternáveis (não simultâneas), toggle
// fixo no topo — antes disso, lista e mapa ficavam sempre lado a lado
// (desktop) ou empilhados (mobile), sem toggle nenhum (nunca foi
// implementado, confirmado em auditoria). Visão Mapa em tela cheia, com
// bottom sheet compacto no toque do pin (mesmo conteúdo resumido do card
// da lista: foto, nome, distância, preço) — Popup padrão do Leaflet foi
// removido do componente de mapa em favor deste bottom sheet.
export function VisaoBusca({
  cards,
  pins,
  mapCenter,
  pertoDeVoce,
  bairroSelecionadoNome,
}: {
  cards: CardBusca[];
  pins: MapPin[];
  mapCenter: [number, number];
  pertoDeVoce: CardBusca[];
  bairroSelecionadoNome: string | null;
}) {
  const [visao, setVisao] = useState<"lista" | "mapa">("lista");
  const [pinSelecionadoId, setPinSelecionadoId] = useState<string | null>(null);
  const cardDoPinSelecionado = cards.find((c) => c.key === pinSelecionadoId) ?? null;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-border bg-white p-1">
          <button
            type="button"
            onClick={() => setVisao("lista")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              visao === "lista" ? "bg-primary text-white" : "text-foreground/60 hover:text-foreground"
            }`}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => setVisao("mapa")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              visao === "mapa" ? "bg-primary text-white" : "text-foreground/60 hover:text-foreground"
            }`}
          >
            Mapa
          </button>
        </div>
      </div>

      {visao === "lista" ? (
        <>
          {pertoDeVoce.length > 0 && (
            <div className="mt-6">
              <h2 className="font-display text-lg font-semibold">Perto de {bairroSelecionadoNome}</h2>
              <div className="mt-3 -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                {pertoDeVoce.map((c) => (
                  <Link
                    key={c.key}
                    href={`/profissionais/${c.professionalId}`}
                    className="flex w-48 shrink-0 flex-col rounded-2xl border border-border bg-white p-4 transition-colors hover:border-primary"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar nome={c.nome} photoUrl={c.fotoUrl} size={36} />
                      <span className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold text-primary">
                        {c.servicoLabel}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-sm font-semibold">{c.nome}</h3>
                    {c.avaliacaoLabel && <p className="mt-0.5 text-xs text-primary">{c.avaliacaoLabel}</p>}
                    {c.distanciaLabel && <p className="mt-1 text-xs text-foreground/60">{c.distanciaLabel}</p>}
                    <p className="mt-1 text-sm font-semibold text-primary">R$ {c.preco}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-4">
            {cards.length === 0 && (
              <p className="text-sm text-foreground/60">Nenhum profissional encontrado com esses filtros.</p>
            )}
            {cards.map((c) => (
              <Link
                key={c.key}
                href={`/profissionais/${c.professionalId}`}
                className="rounded-2xl border border-border bg-white p-5 transition-colors hover:border-primary"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar nome={c.nome} photoUrl={c.fotoUrl} size={48} />
                    <div>
                      <h2 className="font-display text-base font-semibold">{c.nome}</h2>
                      <p className="text-sm text-foreground/60">
                        {c.bairroNome} — {c.bairroCidade}/{c.bairroEstado}
                        {c.distanciaLabel && ` · ${c.distanciaLabel}`}
                      </p>
                      {c.avaliacaoLabel ? (
                        <p className="mt-0.5 text-xs font-medium text-primary">{c.avaliacaoLabel}</p>
                      ) : (
                        <p className="mt-0.5 text-xs font-medium text-accent">✨ Novo no SaúdeAgora</p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                    {c.servicoLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground/70">
                  R$ {c.preco} · {c.duracaoMin} min
                </p>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="relative mt-4 h-[calc(100dvh-260px)] min-h-[420px] overflow-hidden rounded-2xl border border-border">
          <SearchMap center={mapCenter} pins={pins} onSelectPin={setPinSelecionadoId} />

          {cardDoPinSelecionado && (
            <div className="absolute inset-x-0 bottom-0 z-[1000] rounded-t-2xl border-t border-border bg-white p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.12)]">
              <button
                type="button"
                onClick={() => setPinSelecionadoId(null)}
                aria-label="Fechar"
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-border text-foreground/60 hover:text-foreground"
              >
                ✕
              </button>
              <Link
                href={`/profissionais/${cardDoPinSelecionado.professionalId}`}
                className="flex items-center gap-3"
              >
                <Avatar nome={cardDoPinSelecionado.nome} photoUrl={cardDoPinSelecionado.fotoUrl} size={56} />
                <div>
                  <p className="font-display font-semibold">{cardDoPinSelecionado.nome}</p>
                  <p className="text-sm text-foreground/60">
                    {cardDoPinSelecionado.servicoLabel}
                    {cardDoPinSelecionado.distanciaLabel && ` · ${cardDoPinSelecionado.distanciaLabel}`}
                  </p>
                  <p className="text-sm font-semibold text-primary">R$ {cardDoPinSelecionado.preco}</p>
                </div>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
