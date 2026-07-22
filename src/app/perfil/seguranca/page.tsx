import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrocarSenhaForm } from "./form";

export default async function SegurancaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil/seguranca");

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        Segurança
      </span>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">Trocar senha</h1>
      <p className="mt-2 text-sm leading-6 text-foreground/70">
        Sua sessão atual continua ativa depois da troca.
      </p>
      <TrocarSenhaForm />
    </div>
  );
}
