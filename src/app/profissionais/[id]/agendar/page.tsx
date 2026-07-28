import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgendarForm } from "./agendar-form";
import { hojeIsoSP } from "@/lib/format";
import type { Availability, Bairro } from "@/types/database";

type ProfessionalForAgendar = {
  id: string;
  nome: string;
};

export default async function AgendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const currentPath = `/profissionais/${id}/agendar`;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(currentPath)}`);

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!client) {
    // Antes mandava direto pra /registrar, que sempre tenta CRIAR uma
    // conta nova (signUp) — se quem clicou aqui já é profissional
    // (sessão ativa, só não tem linha em clients), isso ou colide no
    // mesmo e-mail ("já existe conta") ou cria uma segunda conta, o que
    // este app não suporta (ver comentário em site-header.tsx). Checa
    // isso primeiro e mostra uma explicação em vez de empurrar pro
    // formulário de criar conta.
    const { data: professional } = await supabase
      .from("professionals")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (professional) {
      return (
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Esta conta é de profissional
          </h1>
          <p className="mt-3 text-base leading-7 text-foreground/70">
            Agendamentos são feitos com uma conta de cliente, separada da conta de profissional.
            Esta fase do SaúdeAgora ainda não permite que a mesma pessoa tenha as duas contas ao
            mesmo tempo.
          </p>
        </div>
      );
    }
    redirect(`/registrar?next=${encodeURIComponent(currentPath)}`);
  }

  const { data: professional } = await supabase
    .from("professionais_publicos")
    .select("id, nome")
    .eq("id", id)
    .maybeSingle<ProfessionalForAgendar>();
  if (!professional) notFound();

  // UTC puro rolaria pro dia seguinte entre 21h e meia-noite de Brasília,
  // escondendo os últimos horários livres de hoje bem no momento em que
  // um cliente mais provavelmente está buscando algo pra essa mesma noite
  // — mesma classe de bug de fuso já corrigida em agenda/ (ver
  // src/lib/format.ts), achada aqui em auditoria (Parte 1).
  const hoje = hojeIsoSP();
  const [{ data: servicos }, { data: slots }, { data: bairros }, { data: enderecosRaw }] =
    await Promise.all([
      supabase
        .from("services")
        .select("id, tipo, preco, duracao_min")
        .eq("professional_id", professional.id)
        .eq("ativo", true),
      supabase
        .from("availability")
        .select("*")
        .eq("professional_id", professional.id)
        .eq("status", "livre")
        .gte("data", hoje)
        .order("data")
        .order("hora_inicio")
        .returns<Availability[]>(),
      supabase.from("bairros").select("*").order("cidade").order("nome").returns<Bairro[]>(),
      // Endereços já usados pelo próprio cliente em qualquer agendamento
      // anterior (não uma tabela nova — só consulta em addresses, já
      // acessível via addresses_select_own) — vira atalho de preenchimento,
      // item de UX pedido depois de US-05/06 estarem estáveis.
      supabase
        .from("addresses")
        .select("id, rua, bairro_id, referencia, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  if (!servicos || servicos.length === 0) notFound();

  // Dedup por rua+bairro (mesmo endereço usado de novo não vira dois
  // atalhos) — mantém só a ocorrência mais recente de cada combinação,
  // já que a lista veio ordenada por created_at desc.
  const enderecosAnteriores: { rua: string; bairroId: string; referencia: string | null }[] = [];
  const vistos = new Set<string>();
  for (const e of enderecosRaw ?? []) {
    const chave = `${e.rua}|${e.bairro_id}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    enderecosAnteriores.push({ rua: e.rua, bairroId: e.bairro_id, referencia: e.referencia });
    if (enderecosAnteriores.length >= 4) break;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        Agendamento
      </span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
        Agendar com {professional.nome}
      </h1>
      <p className="mt-2 text-base leading-7 text-foreground/70">
        Fica como &quot;solicitado&quot; até o profissional confirmar
        manualmente — sem pagamento pelo app nesta fase.
      </p>

      <div className="mt-8">
        <AgendarForm
          professionalId={professional.id}
          professionalNome={professional.nome}
          servicos={servicos}
          slots={slots ?? []}
          bairros={bairros ?? []}
          enderecosAnteriores={enderecosAnteriores}
        />
      </div>
    </div>
  );
}
