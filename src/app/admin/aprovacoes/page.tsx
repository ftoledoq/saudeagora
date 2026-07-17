import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCpf } from "@/lib/cpf";
import { aprovarProfissional, recusarProfissional } from "./actions";

const SERVICE_LABEL: Record<string, string> = {
  personal_trainer: "Personal Trainer",
  massagem: "Massagem",
  pilates: "Pilates",
};

const DOCUMENT_LABEL: Record<string, string> = {
  identidade: "Documento de identidade",
  cref: "Comprovante de CREF",
  outro: "Outro documento",
};

type Address = {
  rua: string;
  referencia: string | null;
  bairro: { nome: string; cidade: string; estado: string } | null;
};

type Service = {
  tipo: string;
  preco: number;
  duracao_min: number;
  descricao: string | null;
};

type Document = {
  id: string;
  tipo: string;
  storage_key: string;
  validade: string | null;
};

type PendingProfessional = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  raio_atendimento_km: number;
  preco_base: number;
  created_at: string;
  endereco: Address | null;
  services: Service[];
  professional_documents: Document[];
};

export default async function AprovacoesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/aprovacoes");

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <h1 className="font-display text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-foreground/70">
          Esta área é só para a equipe interna. Sua conta ({user.email}) não
          tem permissão de admin.
        </p>
      </div>
    );
  }

  const { data: pendentes, error } = await supabase
    .from("professionals")
    .select(
      "id, nome, cpf, telefone, email, raio_atendimento_km, preco_base, created_at, endereco:addresses(rua, referencia, bairro:bairros(nome, cidade, estado)), services(tipo, preco, duracao_min, descricao), professional_documents(id, tipo, storage_key, validade)"
    )
    .eq("status", "pendente")
    .order("created_at", { ascending: true })
    .returns<PendingProfessional[]>();

  if (error) throw new Error(error.message);

  const professionals = pendentes ?? [];

  const signedUrlByDocId = new Map<string, string>();
  await Promise.all(
    professionals.flatMap((p) =>
      p.professional_documents.map(async (doc) => {
        const { data } = await supabase.storage
          .from("professional-documents")
          .createSignedUrl(doc.storage_key, 300);
        if (data?.signedUrl) signedUrlByDocId.set(doc.id, data.signedUrl);
      })
    )
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        Ferramenta interna
      </span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
        Aprovação de cadastro
      </h1>
      <p className="mt-2 text-base leading-7 text-foreground/70">
        {professionals.length} profissional(is) aguardando análise — SLA de
        24h úteis a partir do envio.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {professionals.length === 0 && (
          <p className="text-sm text-foreground/60">
            Nenhum cadastro pendente no momento.
          </p>
        )}

        {professionals.map((p) => {
          const servico = p.services[0];
          const cref = p.professional_documents.find((d) => d.tipo === "cref");
          const crefVencido = cref?.validade
            ? new Date(cref.validade) < new Date(new Date().toDateString())
            : false;

          return (
            <div key={p.id} className="rounded-2xl border border-border bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-semibold">{p.nome}</h2>
                  <p className="text-sm text-foreground/60">
                    CPF {formatCpf(p.cpf)} · {p.telefone} · {p.email}
                  </p>
                </div>
                {servico && (
                  <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                    {SERVICE_LABEL[servico.tipo] ?? servico.tipo}
                  </span>
                )}
              </div>

              {p.endereco?.bairro && (
                <p className="mt-3 text-sm text-foreground/70">
                  {p.endereco.rua}, {p.endereco.bairro.nome} —{" "}
                  {p.endereco.bairro.cidade}/{p.endereco.bairro.estado}
                  {p.endereco.referencia && ` (${p.endereco.referencia})`}
                </p>
              )}

              {servico && (
                <p className="mt-1 text-sm text-foreground/70">
                  R$ {servico.preco} · {servico.duracao_min} min · raio de{" "}
                  {p.raio_atendimento_km} km
                  {servico.descricao && ` — ${servico.descricao}`}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                {p.professional_documents.map((doc) => {
                  const url = signedUrlByDocId.get(doc.id);
                  const vencido = doc.tipo === "cref" && crefVencido;
                  return (
                    <a
                      key={doc.id}
                      href={url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                        vencido
                          ? "border-error text-error"
                          : "border-border text-foreground/80 hover:border-primary hover:text-primary"
                      }`}
                    >
                      {DOCUMENT_LABEL[doc.tipo] ?? doc.tipo}
                      {doc.validade && ` (válido até ${doc.validade})`}
                      {vencido && " — VENCIDO"}
                    </a>
                  );
                })}
              </div>

              <form className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
                <input type="hidden" name="id" value={p.id} />
                <input
                  type="text"
                  name="motivo"
                  placeholder="Motivo (obrigatório só para recusar)"
                  className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button
                    formAction={recusarProfissional}
                    className="rounded-full border border-error px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-light"
                  >
                    Recusar
                  </button>
                  <button
                    formAction={aprovarProfissional}
                    className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                  >
                    Aprovar
                  </button>
                </div>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
