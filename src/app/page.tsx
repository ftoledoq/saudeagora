import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/lib/brand-mark";
import {
  ProfessionalPreviewCard,
  type ProfessionalPreviewCardData,
} from "@/components/professional-preview-card";

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

// A partir de quantos profissionais aprovados vale a pena mostrar o número
// bruto — abaixo disso, "3 profissionais" soa mais fraco do que
// tranquilizador. Formulação alternativa não depende de quantidade.
const LIMIAR_PROVA_SOCIAL = 5;

// Quantos cards a prévia da landing mostra — não é a Busca (sem filtro,
// sem paginação), só uma demonstração rápida com link "Ver todos".
const LIMITE_CARROSSEL_LANDING = 8;

export default async function Home() {
  const supabase = await createClient();

  // Mesmo raciocínio de perf do layout raiz (src/app/layout.tsx): getSession()
  // lê o cookie local, sem round-trip de rede — suficiente aqui porque é só
  // uma decisão de "pra onde mandar", não uma fronteira de segurança nem
  // acesso a dado sensível. Antes disto, a landing aparecia igual pra
  // qualquer sessão, logada ou não — sem nenhum motivo pra alguém já
  // cadastrado ver texto de captação de novo toda vez que abre "/".
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) redirect("/buscar");

  const { count: totalVerificados } = await supabase
    .from("professionais_publicos")
    .select("*", { count: "exact", head: true });

  const provaSocial =
    (totalVerificados ?? 0) >= LIMIAR_PROVA_SOCIAL
      ? `${totalVerificados} profissionais verificados na região`
      : "Cada profissional é aprovado manualmente e tem o CREF conferido antes de aparecer aqui";

  // Prévia real de profissionais aprovados — mesma fonte seleciona colunas
  // públicas já usada na Busca (professionais_publicos, ver migration
  // 0013), sem paginação/filtro, só uma amostra com link "Ver todos".
  const { data: profissionaisPublicos } = await supabase
    .from("professionais_publicos")
    .select("id, nome, foto_storage_key")
    .order("nome")
    .limit(LIMITE_CARROSSEL_LANDING);

  const idsProfissionais = (profissionaisPublicos ?? []).map((p) => p.id);
  const { data: services } =
    idsProfissionais.length > 0
      ? await supabase
          .from("services")
          .select("professional_id, tipo, preco")
          .eq("ativo", true)
          .in("professional_id", idsProfissionais)
      : { data: [] as { professional_id: string; tipo: string; preco: number }[] };

  // Um card por PROFISSIONAL (não por serviço, como a Busca faz) — mostra o
  // serviço mais barato dele como "a partir de". Profissional sem nenhum
  // serviço ativo não aparece na prévia (nada pra oferecer ainda).
  const servicoMaisBaratoPorProfissional = new Map<string, { tipo: string; preco: number }>();
  for (const s of services ?? []) {
    const atual = servicoMaisBaratoPorProfissional.get(s.professional_id);
    if (!atual || s.preco < atual.preco) {
      servicoMaisBaratoPorProfissional.set(s.professional_id, { tipo: s.tipo, preco: s.preco });
    }
  }
  const profissionaisComServico = (profissionaisPublicos ?? []).filter((p) =>
    servicoMaisBaratoPorProfissional.has(p.id)
  );

  // Foto + avaliação por profissional — mesmo cálculo já usado na Busca
  // (reviews agregadas por booking.professional_id + RPC
  // atendimentos_realizados_count, migration 0016), reaproveitado aqui.
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

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b border-border bg-primary-light">
        {/* Sem foto/ilustração real disponível nesta fase — tratamento
            gráfico com a própria marca (pino + pulso) em escala grande e
            opacidade baixa, só de fundo, nunca competindo com o texto.
            Nada decorativo à toa: é a marca de verdade, não um gradiente
            genérico. Trocar por foto real assim que houver um ativo. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/2 hidden -translate-y-1/2 opacity-[0.08] sm:block"
        >
          <BrandMark size={480} stroke="#0f6e5c" fill="#0f6e5c" />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-24">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Região piloto · vagas de teste
          </span>
          <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Personal trainer, massagem e pilates perto de você
          </h1>
          <p className="max-w-xl text-lg leading-7 text-foreground/70">
            Profissionais com cadastro e CREF conferidos manualmente.
          </p>
          <Link
            href="/buscar"
            className="rounded-full bg-accent px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Buscar profissionais perto de você
          </Link>
          <p className="text-sm font-medium text-foreground/70">{provaSocial}</p>
          <Link
            href="/cadastro"
            className="mt-2 text-sm font-medium text-foreground/50 transition-colors hover:text-primary hover:underline"
          >
            Sou profissional, quero atender →
          </Link>
        </div>
      </section>

      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
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

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Profissionais aprovados na região
          </h2>
          <Link href="/buscar" className="text-sm font-semibold text-primary hover:underline">
            Ver todos →
          </Link>
        </div>
        {cardsPreview.length > 0 ? (
          <div className="mt-8 -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {cardsPreview.map((c) => (
              <ProfessionalPreviewCard key={c.key} card={c} mostrarVerificado />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-foreground/60">
            Ainda não temos profissionais aprovados publicados nesta região —{" "}
            <Link href="/cadastro" className="font-medium text-primary hover:underline">
              seja o primeiro a se cadastrar
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}
