import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeroIllustration } from "@/components/hero-illustration";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import {
  ProfessionalPreviewCard,
  type ProfessionalPreviewCardData,
} from "@/components/professional-preview-card";
import {
  CategoryPreviewCard,
  type CategoryPreviewCardData,
} from "@/components/category-preview-card";

const SERVICE_LABEL: Record<string, string> = {
  personal_trainer: "Personal Trainer",
  massagem: "Massagem",
  pilates: "Pilates",
};

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const CONFIANCA = [
  {
    titulo: "Cadastro verificado",
    descricao:
      "Todo profissional passa por aprovação manual antes de aparecer na busca.",
    icone: (
      <svg {...iconProps}>
        <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    titulo: "CREF conferido",
    descricao:
      "Personal trainers têm o registro profissional validado, com reverificação por validade.",
    icone: (
      <svg {...iconProps}>
        <circle cx="12" cy="9" r="5" />
        <path d="M9 13.5 7 21l5-3 5 3-2-7.5" />
      </svg>
    ),
  },
  {
    titulo: "Avaliação real",
    descricao:
      "Todo atendimento concluído pode ser avaliado — histórico visível para quem procura.",
    icone: (
      <svg {...iconProps}>
        <path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.8z" />
      </svg>
    ),
  },
];

// Faixa de referência pra quando ainda não há serviço ativo cadastrado
// nessa categoria — só usada como fallback (ver CATEGORIAS abaixo); assim
// que existir preço real no banco, ele sempre vence.
const FAIXA_TIPICA: Record<string, number> = {
  personal_trainer: 80,
  massagem: 90,
  pilates: 70,
};

const CATEGORIAS: { tipo: string; nome: string; descricao: string; icone: React.ReactNode }[] = [
  {
    tipo: "personal_trainer",
    nome: "Personal Trainer",
    descricao: "Treino individual, no seu horário e endereço.",
    icone: (
      <svg {...iconProps}>
        <rect x="2" y="9" width="4" height="6" rx="1" />
        <rect x="18" y="9" width="4" height="6" rx="1" />
        <line x1="6" y1="12" x2="18" y2="12" />
      </svg>
    ),
  },
  {
    tipo: "massagem",
    nome: "Massagem",
    descricao: "Relaxamento e terapia manual no seu endereço.",
    icone: (
      <svg {...iconProps}>
        <path d="M4 14c0-3 2-5 4-5s3 1 3 3-1 3-3 3" />
        <path d="M20 14c0-3-2-5-4-5s-3 1-3 3 1 3 3 3" />
        <path d="M9 15c1 2 2 3 3 3s2-1 3-3" />
      </svg>
    ),
  },
  {
    tipo: "pilates",
    nome: "Pilates",
    descricao: "Aulas individuais adaptadas ao seu ritmo.",
    icone: (
      <svg {...iconProps}>
        <circle cx="12" cy="7" r="3" />
        <path d="M6 20c0-4 3-6 6-6s6 2 6 6" />
        <path d="M9 20l3-4 3 4" />
      </svg>
    ),
  },
];

// Quantos cards a prévia da landing mostra — não é a Busca (sem filtro,
// sem paginação), só uma demonstração rápida com link "Ver todos".
const LIMITE_CARROSSEL_LANDING = 8;

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) redirect("/buscar");

  // Sem limite aqui — pilot de uma região só, dataset pequeno; o cálculo de
  // preço/cidade precisa do conjunto INTEIRO, não só da amostra que vai
  // aparecer no carrossel (essa é recortada depois, só pra exibição).
  const { data: profissionaisPublicos } = await supabase
    .from("professionais_publicos")
    .select("id, nome, foto_storage_key, bairro_cidade")
    .order("nome");

  const idsProfissionais = (profissionaisPublicos ?? []).map((p) => p.id);
  const { data: servicosAtivos } =
    idsProfissionais.length > 0
      ? await supabase
          .from("services")
          .select("professional_id, tipo, preco")
          .eq("ativo", true)
          .in("professional_id", idsProfissionais)
      : { data: [] as { professional_id: string; tipo: string; preco: number }[] };

  // Cidade piloto real — vem do primeiro profissional publicado; sem
  // nenhum ainda, cai pro primeiro bairro cadastrado (a região piloto é
  // sempre uma cidade só, nunca mistura, ver PRD 14.1).
  let cidadePiloto = profissionaisPublicos?.[0]?.bairro_cidade ?? null;
  if (!cidadePiloto) {
    const { data: bairro } = await supabase.from("bairros").select("cidade").limit(1).maybeSingle();
    cidadePiloto = bairro?.cidade ?? null;
  }
  // "no Rio de Janeiro" é a forma correta em português (não "em Rio de
  // Janeiro") — região piloto atual; qualquer outra cidade usa "em" direto.
  const cidadeTexto = cidadePiloto
    ? cidadePiloto === "Rio de Janeiro"
      ? "no Rio de Janeiro"
      : `em ${cidadePiloto}`
    : "na sua região";

  const precoMinPorTipo = new Map<string, number>();
  for (const s of servicosAtivos ?? []) {
    const atual = precoMinPorTipo.get(s.tipo);
    if (atual === undefined || s.preco < atual) precoMinPorTipo.set(s.tipo, s.preco);
  }
  const todosOsPrecos = (servicosAtivos ?? []).map((s) => s.preco);
  const precoMinGeral = todosOsPrecos.length > 0 ? Math.min(...todosOsPrecos) : null;
  const precoAncoraHero = precoMinGeral ?? Math.min(...Object.values(FAIXA_TIPICA));

  // Um card por PROFISSIONAL (não por serviço, como a Busca faz) — mostra
  // o serviço mais barato dele como "a partir de". Profissional sem
  // nenhum serviço ativo não aparece na prévia.
  const servicoMaisBaratoPorProfissional = new Map<string, { tipo: string; preco: number }>();
  for (const s of servicosAtivos ?? []) {
    const atual = servicoMaisBaratoPorProfissional.get(s.professional_id);
    if (!atual || s.preco < atual.preco) {
      servicoMaisBaratoPorProfissional.set(s.professional_id, { tipo: s.tipo, preco: s.preco });
    }
  }
  const profissionaisComServico = (profissionaisPublicos ?? [])
    .filter((p) => servicoMaisBaratoPorProfissional.has(p.id))
    .slice(0, LIMITE_CARROSSEL_LANDING);

  // Foto + avaliação — só pros que de fato vão aparecer no carrossel
  // (mesmo raciocínio de custo já usado na Busca: nunca busca signed
  // URL/reviews de quem não vai ser mostrado). Mesmo cálculo de avaliação
  // (reviews agregadas por booking.professional_id, migration 0016),
  // reaproveitado aqui.
  const fotoUrlPorProfissional = new Map<string, string>();
  const avaliacaoPorProfissional = new Map<string, { media: number | null; total: number }>();
  await Promise.all(
    profissionaisComServico.map(async (p) => {
      const tarefas: Promise<unknown>[] = [];

      if (p.foto_storage_key) {
        tarefas.push(
          supabase.storage
            .from("professional-documents")
            .createSignedUrl(p.foto_storage_key, 300)
            .then(({ data }) => {
              if (data?.signedUrl) fotoUrlPorProfissional.set(p.id, data.signedUrl);
            })
        );
      }

      tarefas.push(
        Promise.resolve(
          supabase
            .from("reviews")
            .select("nota, booking:bookings!inner(professional_id)")
            .eq("booking.professional_id", p.id)
            .returns<{ nota: number }[]>()
        ).then(({ data: reviews }) => {
          const total = reviews?.length ?? 0;
          avaliacaoPorProfissional.set(p.id, {
            total,
            media: total > 0 ? reviews!.reduce((soma, r) => soma + r.nota, 0) / total : null,
          });
        })
      );

      await Promise.all(tarefas);
    })
  );

  const cardsPreview: ProfessionalPreviewCardData[] = profissionaisComServico.map((p) => {
    const servico = servicoMaisBaratoPorProfissional.get(p.id)!;
    const avaliacao = avaliacaoPorProfissional.get(p.id);
    return {
      key: p.id,
      professionalId: p.id,
      nome: p.nome,
      fotoUrl: fotoUrlPorProfissional.get(p.id) ?? null,
      servicoLabel: SERVICE_LABEL[servico.tipo] ?? servico.tipo,
      preco: servico.preco,
      avaliacaoLabel:
        avaliacao && avaliacao.total > 0 ? `${avaliacao.media!.toFixed(1)} ★ (${avaliacao.total})` : null,
      distanciaLabel: null,
    };
  });

  // Nunca um estado vazio — sem profissional real pra mostrar, a prévia
  // vira as três categorias com preço de referência (real, se já existir
  // algum serviço ativo daquele tipo; senão a faixa típica).
  const categoriasFallback: CategoryPreviewCardData[] = CATEGORIAS.map((c) => ({
    tipo: c.tipo,
    nome: c.nome,
    descricao: c.descricao,
    icone: c.icone,
    precoAPartir: precoMinPorTipo.get(c.tipo) ?? FAIXA_TIPICA[c.tipo],
  }));

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b border-border bg-primary-light">
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pt-10 sm:px-6 sm:pt-14 md:grid-cols-2 md:items-center md:gap-12">
          <div className="order-2 flex flex-col items-start gap-4 md:order-1">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Profissionais verificados {cidadeTexto}
            </span>
            <h1 className="max-w-xl font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              Personal trainer, massagem e pilates perto de você
            </h1>
            <p className="max-w-xl text-lg leading-7 text-foreground/70">
              Profissionais com cadastro e CREF conferidos manualmente.
            </p>
            <p className="text-base font-semibold text-primary">
              A partir de R$ {precoAncoraHero} a sessão
            </p>
            {/* Uma ação só no hero — "Sou profissional" já mora no
                cabeçalho (src/components/site-header.tsx), não precisa de
                um segundo link concorrendo com o CTA aqui. */}
            <Link
              href="/buscar"
              className="rounded-full bg-accent px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Buscar profissionais perto de você
            </Link>
          </div>
          {/* Presença humana no hero — ilustração original (não foto: sem
              ativo disponível nesta fase, ver componente pra detalhe),
              mesmo estilo de traço já usado na marca. Fundo sólido, sem
              blur/translucidez (não é glassmorphism, só uma base pra
              destacar o traço sobre o verde-claro da seção). */}
          <div className="order-1 flex justify-center md:order-2">
            <div className="flex h-56 w-56 items-center justify-center rounded-full bg-white sm:h-72 sm:w-72">
              <HeroIllustration size={200} />
            </div>
          </div>
        </div>
        {/* Dica de continuidade — funcional (sinaliza que há mais
            conteúdo abaixo), não decorativa; para de animar sozinha pra
            quem desativou movimento no sistema (motion-safe:). */}
        <div className="relative flex justify-center pb-3 pt-2">
          <svg
            aria-hidden
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary/40 motion-safe:animate-bounce"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </section>

      <RevealOnScroll>
        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {cardsPreview.length > 0 ? "Profissionais aprovados na região" : "O que você encontra por aqui"}
            </h2>
            <Link href="/buscar" className="text-sm font-semibold text-primary hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="mt-8 -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {cardsPreview.length > 0
              ? cardsPreview.map((c) => <ProfessionalPreviewCard key={c.key} card={c} mostrarVerificado />)
              : categoriasFallback.map((c) => <CategoryPreviewCard key={c.tipo} card={c} />)}
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="border-y border-border bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              O que checamos antes de aparecer pra você
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {CONFIANCA.map((item) => (
                <div key={item.titulo} className="rounded-2xl border border-border bg-white p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary">
                    {item.icone}
                  </span>
                  <h3 className="mt-3 font-display text-base font-semibold text-primary">
                    {item.titulo}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-foreground/70">{item.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Pronto pra agendar?</h2>
          <p className="mt-2 text-foreground/70">
            Profissionais verificados {cidadeTexto}, a partir de R$ {precoAncoraHero} a sessão.
          </p>
          <Link
            href="/buscar"
            className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Buscar profissionais perto de você
          </Link>
        </section>
      </RevealOnScroll>
    </div>
  );
}
