import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SearchMap, type MapPin } from "@/components/map/search-map-loader";
import type { Bairro } from "@/types/database";

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

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{
    cidade?: string;
    bairro?: string;
    tipo?: string;
    preco_max?: string;
    ordenar?: string;
  }>;
}) {
  const {
    cidade: cidadeParam,
    bairro: bairroId,
    tipo,
    preco_max: precoMaxParam,
    ordenar,
  } = await searchParams;
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
    for (const s of servicosPorProfissional.get(p.id) ?? []) {
      if (tipo && s.tipo !== tipo) continue;
      if (precoMax && s.preco > precoMax) continue;
      cards.push({
        key: `${p.id}-${s.tipo}`,
        professionalId: p.id,
        nome: p.nome,
        bairro: bairroProf,
        servico: s,
        distanciaKm: bairroSelecionado
          ? haversineKm(
              bairroSelecionado.latitude,
              bairroSelecionado.longitude,
              bairroProf.latitude,
              bairroProf.longitude
            )
          : null,
      });
    }
  }

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Buscar profissionais
      </h1>
      <p className="mt-2 text-foreground/70">
        {cards.length} resultado(s) em {cidadeSelecionada}
        {bairroSelecionado && ` — perto de ${bairroSelecionado.nome}`}
      </p>

      <form
        method="get"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-white p-4"
      >
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

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-4">
          {cards.length === 0 && (
            <p className="text-sm text-foreground/60">
              Nenhum profissional encontrado com esses filtros.
            </p>
          )}
          {cards.map((c) => (
            <Link
              key={c.key}
              href={`/profissionais/${c.professionalId}`}
              className="rounded-2xl border border-border bg-white p-5 transition-colors hover:border-primary"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-semibold">{c.nome}</h2>
                  <p className="text-sm text-foreground/60">
                    {c.bairro.nome} — {c.bairro.cidade}/{c.bairro.estado}
                    {c.distanciaKm != null && ` · ${c.distanciaKm.toFixed(1)} km`}
                  </p>
                </div>
                <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                  {SERVICE_LABEL[c.servico.tipo] ?? c.servico.tipo}
                </span>
              </div>
              <p className="mt-2 text-sm text-foreground/70">
                R$ {c.servico.preco} · {c.servico.duracao_min} min
              </p>
            </Link>
          ))}
        </div>

        <div className="h-[420px] overflow-hidden rounded-2xl border border-border lg:h-auto lg:min-h-[420px]">
          <SearchMap center={mapCenter} pins={pins} />
        </div>
      </div>
    </div>
  );
}
