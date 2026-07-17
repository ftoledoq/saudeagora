import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgendarForm } from "./agendar-form";
import type { Availability, Bairro } from "@/types/database";

type ProfessionalForAgendar = {
  id: string;
  nome: string;
  services: { id: string; tipo: string; preco: number; duracao_min: number }[];
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
    .from("professionals")
    .select("id, nome, services(id, tipo, preco, duracao_min)")
    .eq("id", id)
    .eq("status", "aprovado")
    .maybeSingle<ProfessionalForAgendar>();
  if (!professional) notFound();

  const servico = professional.services[0];
  if (!servico) notFound();

  const hoje = new Date().toISOString().slice(0, 10);
  const [{ data: slots }, { data: bairros }] = await Promise.all([
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
  ]);

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
        />
      </div>
    </div>
  );
}
