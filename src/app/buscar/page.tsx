import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SearchMap, type MapPin } from "@/components/map/search-map-loader";
import { UsarLocalizacaoButton } from "@/components/usar-localizacao-button";
import { Avatar } from "@/components/avatar";
import { FiltrosBusca } from "./filtros-busca";
import type { Bairro } from "@/types/database";

// Distância vem de centro de bairro, não endereço exato — mostrar
// "3.2 km" finge uma precisão que não temos. Faixas honestas em vez de
// número com casa decimal.
function faixaDistancia(km: number): string {
  if (km < 1) return "menos de 1 km";
  if (km < 3) return "1–3 km";
  if (km < 5) return "3–5 km";
  if (km < 10) return "5–10 km";
  return "mais de 10 km";
}

const SERVICE_LABEL: Record<string, string> = {
  personal_trainer: "Personal Trainer",
  massagem: "Massagem",
  pilates: "Pilates",
};

// Distância em linha reta — suficiente para ordenar resultados com
// coordenada aproximada por bairro (não é rota real).
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type Servico = {
  professional_id: string;
  tipo: string;
  preco: number;
  duracao_min: number;
  descricao: string | null;
};

// Colunas seguras só (id/nome/bio/foto/bairro) — nunca cpf/telefone/email
// (professionals) nem rua/referencia (addresses). Ver migration 0013:
// professionais_publicos é uma view que já filtra por aprovado+CREF válido,
// sem depender de SELECT direto na tabela professionals/addresses por
// anon/authenticated (que vazava a linha inteira).
type ProfessionalPublico = {
  id: string;
  nome: string;
  foto_storage_key: string | null;
  bairro_id: string;
  bairro_nome: string;
  bairro_cidade: string;
  bairro_estado: string;
  bairro_latitude: number;
  bairro_longitude: number;
};

type Card = {
  key: string;
  professionalId: string;
  nome: string;
  bairro: Bairro;
  servico: Servico;
  distanciaKm: number | null;
};

type Avaliacao = { media: number | null; total: number; atendimentos: number };

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{
    cidade?: string;
    bairro?: string;
    tipo?: string;
    preco_max?: string;
    ordenar?: string;
    raio_km?: string;
  }>;
}) {
  const {
    cidade: cidadeParam,
    bairro: bairroId,
    tipo,
    preco_max: precoMaxParam,
    ordenar,
    raio_km: raioKmParam,
  } = await searchParams;
  const raioKm = raioKmParam ? Number(raioKmParam) : null;
  const supabase = await createClient();

  const [{ data: bairros }, { data: profissionais }, { data: services }] = await Promise.all([
    supabase.from("bairros").select("*").order("cidade").order("nome").returns<Bairro[]>(),
    supabase.from("professionais_publicos").select("*").returns<ProfessionalPublico[]>(),
    supabase.from("services").select("professional_id, tipo, preco, duracao_min, descricao").returns<Servico[]>(),
  ]);

  const servicosPorProfissional = new Map<string, Servico[]>();
  for (const s of services ?? []) {
    const lista = servicosPorProfissional.get(s.professional_id) ?? [];
    lista.push(s);
    servicosPorProfissional.set(s.professional_id, lista);
  }

  const todosBairros = bairros ?? [];

  // Uma região piloto por vez — a busca nunca mistura cidades (PRD 14.1: o
  // modelo depende de densidade concentrada numa região só). Sem isso, um
  // cliente no Rio veria profissional de São Paulo no resultado.
  const cidadesDisponiveis = [...new Set(todosBairros.map((b) => b.cidade))].sort();
  const cidadeSelecionada =
    cidadeParam && cidadesDisponiveis.includes(cidadeParam)
      ? cidadeParam
      : (cidadesDisponiveis[0] ?? "");

  const listaBairros = todosBairros.filter((b) => b.cidade === cidadeSelecionada);
  const bairroSelecionado = bairroId
    ? listaBairros.find((b) => b.id === bairroId) ?? null
    : null;
  const precoMax = precoMaxParam ? Number(precoMaxParam) : null;

  const cards: Card[] = [];
  for (const p of profissionais ?? []) {
    if (p.bairro_cidade !== cidadeSelecionada) continue;
    const bairroProf: Bairro = {
      id: p.bairro_id,
      nome: p.bairro_nome,
      cidade: p.bairro_cidade,
      estado: p.bairro_estado,
      latitude: p.bairro_latitude,
      longitude: p.bairro_longitude,
    };
    const distanciaKm = bairroSelecionado
      ? haversineKm(
          bairroSelecionado.latitude,
          bairroSelecionado.longitude,
          bairroProf.latitude,
          bairroProf.longitude
        )
      : null;
    // Raio só filtra quando dá pra calcular distância (bairro selecionado)
    // — sem bairro de referência, "raio" não tem centro pra medir a partir.
    if (raioKm && distanciaKm != null && distanciaKm > raioKm) continue;
    for (const s of servicosPorProfissional.get(p.id) ?? []) {
      if (tipo && s.tipo !== tipo) continue;
      if (precoMax && s.preco > precoMax) continue;
      cards.push({
        key: `${p.id}-${s.tipo}`,
        professionalId: p.id,
        nome: p.nome,
        bairro: bairroProf,
        servico: s,
        distanciaKm,
      });
    }
  }

  // "Perto de você": só faz sentido com um bairro de referência (senão não
  // há distância pra ordenar) — os mais próximos, separados da lista
  // completa, item de descoberta rápida.
  const pertoDeVoce = bairroSelecionado
    ? [...cards].sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity)).slice(0, 8)
    : [];

  cards.sort((a, b) => {
    if (ordenar === "preco") return a.servico.preco - b.servico.preco;
    if (a.distanciaKm != null && b.distanciaKm != null) return a.distanciaKm - b.distanciaKm;
    return a.servico.preco - b.servico.preco;
  });

  const primeiroBairroDaCidade = listaBairros[0];
  const mapCenter: [number, number] = bairroSelecionado
    ? [bairroSelecionado.latitude, bairroSelecionado.longitude]
    : primeiroBairroDaCidade
      ? [primeiroBairroDaCidade.latitude, primeiroBairroDaCidade.longitude]
      : [-22.9068, -43.1729];

  const pins: MapPin[] = cards.map((c) => ({
    id: c.key,
    nome: c.nome,
    servico: SERVICE_LABEL[c.servico.tipo] ?? c.servico.tipo,
    preco: c.servico.preco,
    lat: c.bairro.latitude,
    lng: c.bairro.longitude,
  }));

  // Foto e avaliação por profissional (não por card — um profissional
  // pode aparecer em mais de um card se tiver mais de um serviço) — mesma
  // fonte de dado e mesmo cálculo já usados no perfil público
  // (src/app/profissionais/[id]/page.tsx): reviews agregadas por
  // booking.professional_id + atendimentos_realizados_count (RPC que já
  // existe, migration 0016). Reaproveitado aqui, não recriado.
  const idsProfissionaisExibidos = [...new Set(cards.map((c) => c.professionalId))];
  const fotoUrlPorProfissional = new Map<string, string>();
  const avaliacaoPorProfissional = new Map<string, Avaliacao>();
  await Promise.all(
    idsProfissionaisExibidos.map(async (id) => {
      const prof = (profissionais ?? []).find((p) => p.id === id);
      const tarefas: Promise<unknown>[] = [];

      if (prof?.foto_storage_key) {
        tarefas.push(
          supabase.storage
            .from("professional-documents")
            .createSignedUrl(prof.foto_storage_key, 300)
            .then(({ data }) => {
              if (data?.signedUrl) fotoUrlPorProfissional.set(id, data.signedUrl);
            })
        );
      }

      tarefas.push(
        Promise.all([
          supabase
            .from("reviews")
            .select("nota, booking:bookings!inner(professional_id)")
            .eq("booking.professional_id", id)
            .returns<{ nota: number }[]>(),
          supabase.rpc("atendimentos_realizados_count", { p_professional_id: id }),
        ]).then(([{ data: reviews }, { data: atendimentos }]) => {
          const total = reviews?.length ?? 0;
          avaliacaoPorProfissional.set(id, {
            total,
            media: total > 0 ? reviews!.reduce((soma, r) => soma + r.nota, 0) / total : null,
            atendimentos: atendimentos ?? 0,
          });
        })
      );

      await Promise.all(tarefas);
    })
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Buscar profissionais
          </h1>
          <p className="mt-2 text-foreground/70">
            {cards.length} resultado(s) em {cidadeSelecionada}
            {bairroSelecionado && ` — perto de ${bairroSelecionado.nome}`}
          </p>
        </div>
        <UsarLocalizacaoButton bairros={todosBairros} />
      </div>

      <FiltrosBusca
        cidadesDisponiveis={cidadesDisponiveis}
        cidadeSelecionada={cidadeSelecionada}
        listaBairros={listaBairros}
        bairroId={bairroId}
        tipo={tipo}
        raioKmParam={raioKmParam}
        precoMaxParam={precoMaxParam}
        ordenar={ordenar}
        temBairroSelecionado={!!bairroSelecionado}
      />

      {pertoDeVoce.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold">
            Perto de {bairroSelecionado?.nome}
          </h2>
          <div className="mt-3 -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {pertoDeVoce.map((c) => {
              const avaliacao = avaliacaoPorProfissional.get(c.professionalId);
              return (
                <Link
                  key={c.key}
                  href={`/profissionais/${c.professionalId}`}
                  className="flex w-48 shrink-0 flex-col rounded-2xl border border-border bg-white p-4 transition-colors hover:border-primary"
                >
                  <div className="flex items-center gap-2">
                    <Avatar nome={c.nome} photoUrl={fotoUrlPorProfissional.get(c.professionalId)} size={36} />
                    <span className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold text-primary">
                      {SERVICE_LABEL[c.servico.tipo] ?? c.servico.tipo}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-sm font-semibold">{c.nome}</h3>
                  {avaliacao && avaliacao.total > 0 && (
                    <p className="mt-0.5 text-xs text-primary">
                      {avaliacao.media!.toFixed(1)} ★ ({avaliacao.total})
                    </p>
                  )}
                  {c.distanciaKm != null && (
                    <p className="mt-1 text-xs text-foreground/60">{faixaDistancia(c.distanciaKm)}</p>
                  )}
                  <p className="mt-1 text-sm font-semibold text-primary">R$ {c.servico.preco}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-4">
          {cards.length === 0 && (
            <p className="text-sm text-foreground/60">
              Nenhum profissional encontrado com esses filtros.
            </p>
          )}
          {cards.map((c) => {
            const avaliacao = avaliacaoPorProfissional.get(c.professionalId);
            return (
              <Link
                key={c.key}
                href={`/profissionais/${c.professionalId}`}
                className="rounded-2xl border border-border bg-white p-5 transition-colors hover:border-primary"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar nome={c.nome} photoUrl={fotoUrlPorProfissional.get(c.professionalId)} size={48} />
                    <div>
                      <h2 className="font-display text-base font-semibold">{c.nome}</h2>
                      <p className="text-sm text-foreground/60">
                        {c.bairro.nome} — {c.bairro.cidade}/{c.bairro.estado}
                        {c.distanciaKm != null && ` · ${faixaDistancia(c.distanciaKm)}`}
                      </p>
                      {avaliacao && avaliacao.total > 0 ? (
                        <p className="mt-0.5 text-xs font-medium text-primary">
                          {avaliacao.media!.toFixed(1)} ★ ({avaliacao.total}) · {avaliacao.atendimentos} atendimento
                          {avaliacao.atendimentos === 1 ? "" : "s"}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs font-medium text-accent">✨ Novo no SaúdeAgora</p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                    {SERVICE_LABEL[c.servico.tipo] ?? c.servico.tipo}
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground/70">
                  R$ {c.servico.preco} · {c.servico.duracao_min} min
                </p>
              </Link>
            );
          })}
        </div>

        <div className="h-[420px] overflow-hidden rounded-2xl border border-border lg:h-auto lg:min-h-[420px]">
          <SearchMap center={mapCenter} pins={pins} />
        </div>
      </div>
    </div>
  );
}
