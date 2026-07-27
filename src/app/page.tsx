import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
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
    descricao: "Cada profissional é aprovado à mão, um por um. Nada de cadastro automático.",
    icone: (
      <svg {...iconProps}>
        <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    titulo: "CREF conferido",
    descricao: "Personal trainer só entra com registro profissional validado. E revalidado quando vence.",
    icone: (
      <svg {...iconProps}>
        <circle cx="12" cy="9" r="5" />
        <path d="M9 13.5 7 21l5-3 5 3-2-7.5" />
      </svg>
    ),
  },
  {
    titulo: "Avaliação real",
    descricao: "Só quem foi atendido avalia. Nota de gente de verdade.",
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
    titulo: "0% de comissão nos primeiros 90 dias.",
    icone: (
      <svg {...iconProps}>
        <line x1="19" y1="5" x2="5" y2="19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </svg>
    ),
  },
  {
    titulo: "Você define seu preço, seus horários e quem atende.",
    icone: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 15l2 2 4-4" />
      </svg>
    ),
  },
  {
    titulo: "Sem exclusividade. Sua agenda continua sendo sua.",
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

// Sem preço nos cards — decisão de posicionamento: a landing valoriza o
// serviço, não compete por preço. Preço só aparece na Busca e no perfil do
// profissional, onde a pessoa já está comparando de forma consciente.
const CATEGORIAS: { tipo: string; nome: string; descricao: string; imagemSrc: string; icone: React.ReactNode }[] = [
  {
    tipo: "personal_trainer",
    nome: "Personal Trainer",
    descricao: "Treino individual, no seu ritmo e no seu endereço.",
    imagemSrc: "/images/personal-trainer.jpg",
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
    descricao: "Terapia manual com quem entende do assunto. Sem sala de espera.",
    imagemSrc: "/images/massagem.jpg",
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
    descricao: "Aula individual adaptada ao seu corpo, não a uma turma.",
    imagemSrc: "/images/pilates.jpg",
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
  // sempre uma cidade só, nunca mistura, ver PRD 14.1). Badge do hero
  // mostra só o nome da cidade, sem frase em volta.
  let cidadePiloto = profissionaisPublicos?.[0]?.bairro_cidade ?? null;
  if (!cidadePiloto) {
    const { data: bairro } = await supabase.from("bairros").select("cidade").limit(1).maybeSingle();
    cidadePiloto = bairro?.cidade ?? null;
  }
  cidadePiloto = cidadePiloto ?? "Rio de Janeiro";

  // Um card por PROFISSIONAL (não por serviço, como a Busca faz) — o tipo
  // de serviço vira o selo do card; sem preço aqui (ver decisão acima), não
  // importa qual serviço escolher se o profissional tiver mais de um ativo.
  const tipoServicoPorProfissional = new Map<string, { tipo: string; preco: number }>();
  for (const s of servicosAtivos ?? []) {
    if (!tipoServicoPorProfissional.has(s.professional_id)) {
      tipoServicoPorProfissional.set(s.professional_id, { tipo: s.tipo, preco: s.preco });
    }
  }
  const profissionaisComServico = (profissionaisPublicos ?? [])
    .filter((p) => tipoServicoPorProfissional.has(p.id))
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
    const servico = tipoServicoPorProfissional.get(p.id)!;
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
  // vira as três categorias, cada uma com foto real do serviço.
  const categoriasFallback: CategoryPreviewCardData[] = CATEGORIAS.map((c) => ({
    tipo: c.tipo,
    nome: c.nome,
    descricao: c.descricao,
    imagemSrc: c.imagemSrc,
    icone: c.icone,
  }));

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b border-border">
        <div className="relative h-[420px] sm:h-[480px] md:h-[560px]">
          {/* object-top: a foto é mais larga que o recorte da seção em
              telas largas — cortar sempre a partir do topo garante que os
              dois rostos (nos primeiros ~35% da altura da foto original)
              nunca saiam do enquadramento, mesmo quando a seção corta uma
              fatia bem mais curta que a foto inteira. priority (não lazy)
              — é o maior elemento acima da dobra, carregamento adiado
              aqui prejudicaria o LCP, ao contrário do resto das imagens
              da página. */}
          <Image
            src="/images/hero.jpg"
            alt="Profissional de bem-estar atendendo cliente"
            fill
            priority
            sizes="100vw"
            className="object-cover object-top"
          />
          {/* Overlay funcional de contraste, não decorativo — só existe
              pra legibilidade do texto branco por cima da foto, mais
              forte embaixo (onde o texto fica) e transparente em cima
              (onde estão os rostos, pra não escurecer as pessoas na
              foto). */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 pb-10 sm:px-6 sm:pb-14">
              <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                {cidadePiloto}
              </span>
              <h1 className="max-w-xl font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
                O melhor horário pra cuidar de você é o seu.
              </h1>
              <p className="max-w-xl text-lg leading-7 text-white/90">
                Personal trainer, massagem e pilates com profissionais verificados — no seu bairro, no seu
                tempo.
              </p>
              {/* Uma ação só no hero — "Sou profissional" já mora no
                  cabeçalho (src/components/site-header.tsx). */}
              <Link
                href="/buscar"
                className="rounded-full bg-accent px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Encontrar meu profissional
              </Link>
            </div>
          </div>
        </div>
      </section>

      <RevealOnScroll>
        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {cardsPreview.length > 0 ? "Profissionais aprovados na região" : "Do jeito que cabe na sua rotina"}
            </h2>
            {/* "Ver todos" só quando há de fato algo real pra ver — no
                estado de categorias (sem profissional real nenhum), leva
                a uma busca vazia e frustra quem clica. */}
            {cardsPreview.length > 0 && (
              <Link href="/buscar" className="text-sm font-semibold text-primary hover:underline">
                Ver todos →
              </Link>
            )}
          </div>
          <div className="mt-8 -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {cardsPreview.length > 0
              ? cardsPreview.map((c) => (
                  <ProfessionalPreviewCard key={c.key} card={c} mostrarVerificado mostrarPreco={false} />
                ))
              : categoriasFallback.map((c) => <CategoryPreviewCard key={c.tipo} card={c} />)}
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="border-y border-border bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Ninguém aparece aqui sem passar por isso
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
          fundo tingido (bg-primary-light) pra separar visualmente do
          funil de cliente (seções brancas ao redor), fala com outro
          público. */}
      <RevealOnScroll>
        <section className="border-y border-border bg-primary-light">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div className="relative h-56 w-full overflow-hidden rounded-2xl sm:h-72">
                <Image
                  src="/images/profissional.jpg"
                  alt="Profissional de bem-estar"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  Você cuida de gente. A gente cuida do resto.
                </h2>
                <div className="mt-6 flex flex-col gap-4">
                  {ARGUMENTOS_PROFISSIONAL.map((item) => (
                    <div key={item.titulo} className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary">
                        {item.icone}
                      </span>
                      <p className="pt-1.5 text-sm font-semibold leading-6 text-foreground">{item.titulo}</p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/cadastro"
                  className="mt-8 inline-block rounded-full border border-primary px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                >
                  Quero atender no SaúdeAgora
                </Link>
              </div>
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Bora cuidar de você?</h2>
          <p className="mt-2 text-foreground/70">
            Profissionais verificados no seu bairro, prontos pra atender.
          </p>
          <Link
            href="/buscar"
            className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Encontrar meu profissional
          </Link>
        </section>
      </RevealOnScroll>
    </div>
  );
}
