import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/lib/brand-mark";
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

// Estratégia é supply-first (sem profissional não há produto) — argumentos
// concretos, não genéricos, pro profissional decidir se vale a pena
// experimentar nesta fase.
const ARGUMENTOS_PROFISSIONAL = [
  {
    titulo: "0% de comissão no período fundador",
    icone: (
      <svg {...iconProps}>
        <line x1="19" y1="5" x2="5" y2="19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </svg>
    ),
  },
  {
    titulo: "Encha os horários vagos da sua agenda",
    icone: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 15l2 2 4-4" />
      </svg>
    ),
  },
  {
    titulo: "Você define seu preço e sua disponibilidade — sem exclusividade",
    icone: (
      <svg {...iconProps}>
        <line x1="4" y1="6" x2="20" y2="6" />
        <circle cx="9" cy="6" r="2" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <circle cx="15" cy="12" r="2" />
        <line x1="4" y1="18" x2="20" y2="18" />
        <circle cx="9" cy="18" r="2" />
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
  // Ordenado por preço ANTES de recortar pro limite de exibição — sem
  // isso, com mais profissionais que o limite, o mais barato de todos
  // (o que define a âncora de preço do hero) podia ficar de fora do
  // recorte (a lista original vem alfabética), fazendo o hero prometer
  // um preço que nenhum card visível mostra. Ordenar por preço garante
  // que o primeiro card visível bate com a âncora do hero sempre.
  const profissionaisComServico = (profissionaisPublicos ?? [])
    .filter((p) => servicoMaisBaratoPorProfissional.has(p.id))
    .sort(
      (a, b) => servicoMaisBaratoPorProfissional.get(a.id)!.preco - servicoMaisBaratoPorProfissional.get(b.id)!.preco
    )
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
  // algum serviço ativo daquele tipo; senão a faixa típica). Ordenado por
  // preço crescente — mesmo motivo do profissionaisComServico acima: o
  // primeiro card sempre precisa bater com "a partir de R$ X" do hero,
  // nunca mostrar um número maior logo de cara.
  const categoriasFallback: CategoryPreviewCardData[] = CATEGORIAS.map((c) => ({
    tipo: c.tipo,
    nome: c.nome,
    descricao: c.descricao,
    icone: c.icone,
    precoAPartir: precoMinPorTipo.get(c.tipo) ?? FAIXA_TIPICA[c.tipo],
  })).sort((a, b) => a.precoAPartir - b.precoAPartir);

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b border-border bg-primary-light">
        {/* Sem imagem no hero, de propósito — uma ilustração de figura
            humana foi tentada e rejeitada (não comunicava o serviço,
            destoava do resto do app). Só a marca, grande e em opacidade
            bem baixa, puramente de fundo — nunca compete com o texto, que
            é quem carrega a mensagem aqui. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/2 hidden -translate-y-1/2 opacity-[0.08] sm:block"
        >
          <BrandMark size={480} stroke="#0f6e5c" fill="#0f6e5c" />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-12 sm:px-6 sm:py-16">
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
      </section>

      <RevealOnScroll>
        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {cardsPreview.length > 0 ? "Profissionais aprovados na região" : "O que você encontra por aqui"}
            </h2>
            {/* "Ver todos" só quando há de fato algo real pra ver — antes
                aparecia sempre, inclusive no estado de categorias
                (fallback sem profissional real nenhum), levando a uma
                busca vazia e frustrando quem clicava. */}
            {cardsPreview.length > 0 && (
              <Link href="/buscar" className="text-sm font-semibold text-primary hover:underline">
                Ver todos →
              </Link>
            )}
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

      {/* Estratégia é supply-first (sem profissional não há produto) —
          lacuna crítica: antes disto, a captação de profissional
          dependia inteira de um link discreto no cabeçalho, sem nenhum
          argumento. Fundo com tingimento (bg-primary-light) pra separar
          visualmente do funil de cliente (seções brancas ao redor) —
          esta seção fala com outro público. */}
      <RevealOnScroll>
        <section className="border-y border-border bg-primary-light">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Você é profissional de bem-estar?
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {ARGUMENTOS_PROFISSIONAL.map((item) => (
                <div key={item.titulo} className="rounded-2xl border border-border bg-white p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary">
                    {item.icone}
                  </span>
                  <p className="mt-3 text-sm font-semibold leading-6 text-foreground">{item.titulo}</p>
                </div>
              ))}
            </div>
            <Link
              href="/cadastro"
              className="mt-8 inline-block rounded-full border border-primary px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
            >
              Quero me cadastrar como profissional
            </Link>
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
