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

// Raio de cobertura plausível a partir do bairro fixo mais próximo — cobre
// a extensão real de uma região metropolitana (do bairro mais periférico
// ao mais central, ex. Recreio dos Bandeirantes ao Centro do Rio) sem
// "aceitar" uma cidade vizinha inteira como se fosse cobertura de verdade.
const RAIO_COBERTURA_KM = 60;

function preposicaoCidade(cidade: string): string {
  return cidade === "Rio de Janeiro" ? "no" : "em";
}

function listarCidadesAtendidas(cidades: string[]): string {
  const partes = cidades.map((c) => `${preposicaoCidade(c)} ${c}`);
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
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
//
// Bug real relatado (auditoria nova): isso não tinha NENHUM teto de
// distância — alguém em Indaiatuba (a ~100km de São Paulo) caía
// silenciosamente no mapa de São Paulo, sem aviso nenhum, sem forma de
// saber se era bug ou falta de cobertura mesmo. RAIO_COBERTURA_KM
// resolve isso: acima do raio, mostra um estado explícito de "fora de
// cobertura" em vez de trocar de cidade sem avisar. O nome da cidade
// detectada nessa mensagem vem de uma chamada de geocodificação reversa
// (Nominatim) só pra EXIBIÇÃO — nunca decide bairro/cidade (esse
// continua sendo só a coordenada), então a mesma razão que tirou o
// Nominatim da decisão não se aplica aqui: se a chamada falhar ou
// devolver algo estranho, a mensagem cai num texto genérico, nunca break
// a funcionalidade.
export function UsarLocalizacaoButton({ bairros }: { bairros: BairroParaMatch[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [estado, setEstado] = useState<"ocioso" | "buscando" | "erro" | "fora_de_cobertura">("ocioso");
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [cidadeDetectada, setCidadeDetectada] = useState<string | null>(null);

  const cidadesAtendidas = [...new Set(bairros.map((b) => b.cidade))];

  function irParaCidade(cidade: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("cidade", cidade);
    params.delete("bairro");
    router.push(`/buscar?${params.toString()}`);
    setEstado("ocioso");
  }

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
      async (posicao) => {
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

        if (menorDistancia > RAIO_COBERTURA_KM) {
          setEstado("fora_de_cobertura");
          setCidadeDetectada(null);
          try {
            const resposta = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`,
              { headers: { "Accept-Language": "pt-BR" } }
            );
            const dados = await resposta.json();
            const nomeCidade: string | undefined =
              dados?.address?.city ?? dados?.address?.town ?? dados?.address?.municipality;
            if (nomeCidade) setCidadeDetectada(nomeCidade);
          } catch {
            // Sem nome de cidade, a mensagem cai pra formulação genérica —
            // nunca trava nem muda o resultado (essa chamada é só de
            // exibição, ver comentário acima).
          }
          return;
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

      {estado === "fora_de_cobertura" && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEstado("ocioso")} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-white p-5 shadow-[0_-4px_16px_rgba(0,0,0,0.12)]">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-base font-semibold">
                Ainda não chegamos {cidadeDetectada ? `em ${cidadeDetectada}` : "na sua região"}
              </h3>
              <button
                type="button"
                onClick={() => setEstado("ocioso")}
                aria-label="Fechar"
                className="text-foreground/40 hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm text-foreground/70">
              Por enquanto estamos {listarCidadesAtendidas(cidadesAtendidas)}. Pode explorar mesmo assim, se
              quiser.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {cidadesAtendidas.map((cidade) => (
                <button
                  key={cidade}
                  type="button"
                  onClick={() => irParaCidade(cidade)}
                  className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                >
                  Ver {cidade}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
