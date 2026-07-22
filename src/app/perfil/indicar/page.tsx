import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShareReferralButton } from "@/components/share-referral-button";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function IndicarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil/indicar");

  // RLS de clients/professionals só libera a própria linha — contar quem
  // indicou exige ler linha de outra pessoa, por isso via RPC security
  // definer (contar_indicacoes, migration 0021) em vez de SELECT direto.
  const { data: totalIndicadosRaw } = await supabase.rpc("contar_indicacoes");
  const totalIndicados = totalIndicadosRaw ?? 0;

  const link = `${APP_URL}/registrar?ref=${user.id}`;

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        Indique amigos
      </span>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">
        Convide quem você confia
      </h1>
      <p className="mt-2 text-sm leading-6 text-foreground/70">
        Compartilhe seu link — a gente sabe quem veio pela sua indicação.
        Ainda sem recompensa nesta fase, mas é o primeiro passo.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-white p-4">
        <p className="break-all text-sm text-foreground/70">{link}</p>
      </div>

      <div className="mt-4">
        <ShareReferralButton link={link} />
      </div>

      <p className="mt-6 text-center text-sm text-foreground/60">
        {totalIndicados > 0
          ? `${totalIndicados} pessoa${totalIndicados === 1 ? "" : "s"} já entrou pelo seu link.`
          : "Ninguém entrou pelo seu link ainda."}
      </p>
    </div>
  );
}
