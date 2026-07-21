"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type BairroParaMatch = { id: string; nome: string; cidade: string };

// Geolocalização + geocodificação reversa via Nominatim (OpenStreetMap,
// gratuito, sem chave) — só dispara por clique explícito da pessoa, nunca
// automaticamente. Nominatim pede no máximo 1 requisição/segundo por
// cliente; como isso é sempre 1 requisição por clique (nunca um loop),
// está naturalmente dentro do limite sem precisar de throttle adicional.
//
// A precisão é aproximada de propósito: casamos o bairro/cidade retornado
// pelo Nominatim contra nossa tabela fixa de bairros (por nome, não por
// coordenada exata) — mesma limitação já documentada no resto do app
// (centro de bairro, não geocodificação por endereço exato).
export function UsarLocalizacaoButton({ bairros }: { bairros: BairroParaMatch[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [estado, setEstado] = useState<"ocioso" | "buscando" | "erro">("ocioso");
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  function normalizar(texto: string): string {
    return texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
  }

  async function usarLocalizacao() {
    if (!("geolocation" in navigator)) {
      setEstado("erro");
      setMensagemErro("Seu navegador não permite compartilhar localização.");
      return;
    }

    setEstado("buscando");
    setMensagemErro(null);

    navigator.geolocation.getCurrentPosition(
      async (posicao) => {
        try {
          const { latitude, longitude } = posicao.coords;
          const resposta = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=pt-BR`
          );
          if (!resposta.ok) throw new Error("geocodificação falhou");
          const dados = await resposta.json();
          const endereco = dados?.address ?? {};

          const candidatosCidade: string[] = [endereco.city, endereco.town, endereco.municipality].filter(
            Boolean
          );
          const candidatosBairro: string[] = [endereco.suburb, endereco.neighbourhood, endereco.quarter].filter(
            Boolean
          );

          const bairroEncontrado = bairros.find((b) =>
            candidatosBairro.some((c) => normalizar(c) === normalizar(b.nome))
          );
          const cidadeEncontrada =
            bairroEncontrado?.cidade ??
            bairros.find((b) => candidatosCidade.some((c) => normalizar(c) === normalizar(b.cidade)))?.cidade;

          if (!cidadeEncontrada) {
            setEstado("erro");
            setMensagemErro("Não encontramos sua região entre as cidades atendidas ainda.");
            return;
          }

          const params = new URLSearchParams(searchParams.toString());
          params.set("cidade", cidadeEncontrada);
          if (bairroEncontrado) {
            params.set("bairro", bairroEncontrado.id);
          } else {
            params.delete("bairro");
          }
          router.push(`/buscar?${params.toString()}`);
          setEstado("ocioso");
        } catch {
          setEstado("erro");
          setMensagemErro("Não conseguimos identificar sua região agora — tente escolher manualmente.");
        }
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
