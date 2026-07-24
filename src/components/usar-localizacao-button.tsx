"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type BairroParaMatch = { id: string; nome: string; cidade: string; latitude: number; longitude: number };

// Distância em linha reta — mesma função já usada em src/app/buscar/page.tsx
// pra ordenar "Perto de você" (não dá pra importar de lá, é Server
// Component; duplicar essa função pura de 10 linhas é mais simples que
// criar um módulo compartilhado só pra isso).
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Antes disso, o bairro (e a cidade) eram decididos por geocodificação
// reversa (Nominatim) + comparação de NOME de bairro/cidade contra a nossa
// tabela fixa — bug real reportado: alguém fisicamente em São Paulo
// continuava caindo no Rio de Janeiro, porque a lista fixa de bairros é
// pequena (só ~11 por cidade) e o nome de bairro/cidade que o Nominatim
// devolve raramente bate exatamente com um desses nomes; quando não bate
// nada, a busca simplesmente não muda de cidade — sem erro visível o
// bastante pra perceber. Agora usa só a COORDENADA (que a própria
// geolocalização do navegador já dá, sem depender de nenhum nome de lugar):
// pega o bairro fixo mais próximo em linha reta, de qualquer cidade —
// mesma lógica de aproximação por centro de bairro já usada no resto do
// app, sem o Nominatim entrar na decisão de todo.
export function UsarLocalizacaoButton({ bairros }: { bairros: BairroParaMatch[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [estado, setEstado] = useState<"ocioso" | "buscando" | "erro">("ocioso");
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  function usarLocalizacao() {
    if (!("geolocation" in navigator)) {
      setEstado("erro");
      setMensagemErro("Seu navegador não permite compartilhar localização.");
      return;
    }
    if (bairros.length === 0) {
      setEstado("erro");
      setMensagemErro("Nenhuma região cadastrada ainda.");
      return;
    }

    setEstado("buscando");
    setMensagemErro(null);

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const { latitude, longitude } = posicao.coords;

        let maisProximo = bairros[0];
        let menorDistancia = haversineKm(latitude, longitude, maisProximo.latitude, maisProximo.longitude);
        for (const b of bairros.slice(1)) {
          const distancia = haversineKm(latitude, longitude, b.latitude, b.longitude);
          if (distancia < menorDistancia) {
            menorDistancia = distancia;
            maisProximo = b;
          }
        }

        const params = new URLSearchParams(searchParams.toString());
        params.set("cidade", maisProximo.cidade);
        params.set("bairro", maisProximo.id);
        router.push(`/buscar?${params.toString()}`);
        setEstado("ocioso");
      },
      () => {
        setEstado("erro");
        setMensagemErro("Permissão de localização negada ou indisponível.");
      },
      { timeout: 10_000 }
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={usarLocalizacao}
        disabled={estado === "buscando"}
        className="flex items-center gap-1.5 rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 disabled:opacity-60"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        {estado === "buscando" ? "Localizando..." : "Usar minha localização"}
      </button>
      {mensagemErro && <p className="text-xs text-error">{mensagemErro}</p>}
    </div>
  );
}
