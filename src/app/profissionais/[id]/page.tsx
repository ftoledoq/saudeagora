import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";

const SERVICE_LABEL: Record<string, string> = {
  personal_trainer: "Personal Trainer",
  massagem: "Massagem",
  pilates: "Pilates",
};

type Servico = {
  tipo: string;
  preco: number;
  duracao_min: number;
  descricao: string | null;
};

// Colunas seguras só — ver migration 0013 (professionais_publicos já
// filtra aprovado+CREF válido, sem SELECT direto em professionals/addresses
// por anon/authenticated, que vazava cpf/telefone/email/rua/referencia).
type ProfessionalPublico = {
  id: string;
  nome: string;
  bio: string | null;
  foto_storage_key: string | null;
  bairro_id: string;
  bairro_nome: string;
  bairro_cidade: string;
  bairro_estado: string;
};

type ReviewRow = {
  nota: number;
  comentario: string | null;
  resposta_profissional: string | null;
  booking: { cliente: { nome: string } | null } | null;
};

export default async function PerfilProfissionalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: professional } = await supabase
    .from("professionais_publicos")
    .select("*")
    .eq("id", id)
    .maybeSingle<ProfessionalPublico>();

  // A view já filtra aprovado + CREF válido — se não veio nada, ou não
  // existe ou não está mais publicável (ex: CREF venceu). Mesma página de
  // "não encontrado" nos dois casos.
  if (!professional) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: services } = await supabase
    .from("services")
    .select("tipo, preco, duracao_min, descricao")
    .eq("professional_id", professional.id)
    .returns<Servico[]>();

  let fotoUrl: string | null = null;
  if (professional.foto_storage_key) {
    const { data } = await supabase.storage
      .from("professional-documents")
      .createSignedUrl(professional.foto_storage_key, 300);
    fotoUrl = data?.signedUrl ?? null;
  }

  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      "nota, comentario, resposta_profissional, booking:bookings!inner(cliente:clients(nome))"
    )
    .eq("booking.professional_id", professional.id)
    .order("created_at", { ascending: false })
    .returns<ReviewRow[]>();

  const listaReviews = reviews ?? [];
  const mediaAvaliacao =
    listaReviews.length > 0
      ? listaReviews.reduce((soma, r) => soma + r.nota, 0) / listaReviews.length
      : null;

  const agendarHref = `/profissionais/${professional.id}/agendar`;
  const ctaHref = user ? agendarHref : `/login?next=${encodeURIComponent(agendarHref)}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Avatar nome={professional.nome} photoUrl={fotoUrl} size={96} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {professional.nome}
            </h1>
            {/* Não checa professional_documents.status — aprovação nesta fase é
                por profissional, não por documento individual (mesma decisão
                da US-02), e esse campo nunca é escrito por ninguém, fica
                sempre 'pendente'. Chegar até aqui já prova aprovado+CREF
                válido (RLS), então a própria visibilidade é a verificação.
                Aprovação granular por documento fica para o painel admin
                completo da Fase 2 — não "consertar" isso lendo status. */}
            <span className="flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">
              ✓ Verificado
            </span>
            {/* Tela 2 do documento de wireframes (US-04): cold-start de
                avaliação (sem nota ainda) mostra "Novo no SaúdeAgora" no
                lugar de nota vazia/zero, mesmo peso visual do selo
                Verificado — para não penalizar profissional recém-aprovado.
                Lacuna identificada em auditoria visual (2026-07-18): nunca
                foi implementado (confirmado via git log -S, não é
                regressão), só existia texto simples lá embaixo. */}
            {mediaAvaliacao === null && (
              <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                ✨ Novo no SaúdeAgora
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-foreground/60">
            {professional.bairro_nome} — {professional.bairro_cidade}/{professional.bairro_estado}
          </p>
        </div>
      </div>

      <p className="mt-6 whitespace-pre-line text-base leading-7 text-foreground/80">
        {professional.bio || "Sem biografia ainda."}
      </p>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Serviços</h2>
        <div className="mt-3 flex flex-col gap-3">
          {(services ?? []).map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl border border-border bg-white p-4"
            >
              <div>
                <p className="font-medium">{SERVICE_LABEL[s.tipo] ?? s.tipo}</p>
                {s.descricao && (
                  <p className="mt-1 text-sm text-foreground/60">{s.descricao}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-display font-semibold text-primary">R$ {s.preco}</p>
                <p className="text-xs text-foreground/60">{s.duracao_min} min</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold">Avaliações</h2>
          {mediaAvaliacao !== null && (
            <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">
              {mediaAvaliacao.toFixed(1)} ★ ({listaReviews.length})
            </span>
          )}
        </div>

        {listaReviews.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/60">
            Ainda sem avaliações — seja o primeiro a agendar.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {listaReviews.map((r, i) => (
              <div key={i} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{r.booking?.cliente?.nome ?? "Cliente"}</p>
                  <p className="text-sm text-primary">
                    {"★".repeat(r.nota)}
                    {"☆".repeat(5 - r.nota)}
                  </p>
                </div>
                {r.comentario && (
                  <p className="mt-1 text-sm text-foreground/70">{r.comentario}</p>
                )}
                {r.resposta_profissional && (
                  <p className="mt-2 border-t border-border pt-2 text-xs text-foreground/60">
                    <strong>Resposta do profissional:</strong> {r.resposta_profissional}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Disponibilidade</h2>
        <p className="mt-2 text-sm text-foreground/60">
          Agenda sob confirmação manual — resposta em até 24h úteis após
          solicitar.
        </p>
      </section>

      <Link
        href={ctaHref}
        className="mt-8 inline-block rounded-full bg-accent px-8 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Agendar sessão
      </Link>
    </div>
  );
}
