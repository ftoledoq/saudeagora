import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MeusDadosForm } from "./meus-dados-form";

export default async function MeusDadosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil/meus-dados");

  const [{ data: professional }, { data: client }] = await Promise.all([
    supabase
      .from("professionals")
      .select("nome, telefone, bio, foto_storage_key")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("clients").select("nome, telefone, bio, foto_storage_key").eq("user_id", user.id).maybeSingle(),
  ]);

  const registro = professional ?? client;
  if (!registro) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 sm:px-6">
        <h1 className="font-display text-2xl font-bold">Meus dados</h1>
        <p className="mt-2 text-foreground/70">
          Não encontramos um cadastro de cliente ou profissional para essa conta.
        </p>
      </div>
    );
  }

  const tipo: "professional" | "client" = professional ? "professional" : "client";
  let fotoUrl: string | null = null;
  if (registro.foto_storage_key) {
    const bucket = tipo === "professional" ? "professional-documents" : "client-photos";
    const { data } = await supabase.storage.from(bucket).createSignedUrl(registro.foto_storage_key, 300);
    fotoUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="font-display text-2xl font-bold tracking-tight">Meus dados</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Nome, telefone, foto e bio usados no seu cadastro.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-white p-6">
        <MeusDadosForm
          tipo={tipo}
          nomeAtual={registro.nome}
          telefoneAtual={registro.telefone}
          bioAtual={registro.bio}
          fotoUrlAtual={fotoUrl}
        />
      </div>
    </div>
  );
}
