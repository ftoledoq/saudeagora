import { createClient } from "@/lib/supabase/server";
import { CadastroForm } from "./cadastro-form";
import type { Bairro } from "@/types/database";

export default async function CadastroPage() {
  const supabase = await createClient();
  const { data: bairros } = await supabase
    .from("bairros")
    .select("*")
    .order("cidade")
    .order("nome")
    .returns<Bairro[]>();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        Cadastro de profissional
      </span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
        Vamos te conhecer
      </h1>
      <p className="mt-2 text-base leading-7 text-foreground/70">
        Depois de enviado, seu cadastro passa por análise manual — resposta em
        até 24h úteis.
      </p>

      <div className="mt-8">
        <CadastroForm bairros={bairros ?? []} />
      </div>
    </div>
  );
}
