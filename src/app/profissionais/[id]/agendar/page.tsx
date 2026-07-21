import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgendarForm } from "./agendar-form";
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
  if (!client) redirect(`/registrar?next=${encodeURIComponent(currentPath)}`);

  const { data: professional } = await supabase
    .from("professionais_publicos")
    .select("id, nome")
    .eq("id", id)
    .maybeSingle<ProfessionalForAgendar>();
  if (!professional) notFound();

  const hoje = new Date().toISOString().slice(0, 10);
  const [{ data: servicos }, { data: slots }, { data: bairros }, { data: enderecosRaw }] =
    await Promise.all([
      supabase
        .from("services")
        .select("id, tipo, preco, duracao_min")
        .eq("professional_id", professional.id),
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

  const servico = servicos?.[0];
  if (!servico) notFound();

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
          servico={servico}
          slots={slots ?? []}
          bairros={bairros ?? []}
          enderecosAnteriores={enderecosAnteriores}
        />
      </div>
    </div>
  );
}
