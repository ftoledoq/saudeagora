import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { sair } from "./actions";

const AJUDA_EMAIL = "saudeagora@zohomail.com";

export default async function PerfilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil");

  const [{ data: professional }, { data: client }] = await Promise.all([
    supabase.from("professionals").select("nome, foto_storage_key").eq("user_id", user.id).maybeSingle(),
    supabase.from("clients").select("nome").eq("user_id", user.id).maybeSingle(),
  ]);

  const nome = professional?.nome ?? client?.nome ?? user.email ?? "Você";

  let fotoUrl: string | null = null;
  if (professional?.foto_storage_key) {
    const { data } = await supabase.storage
      .from("professional-documents")
      .createSignedUrl(professional.foto_storage_key, 300);
    fotoUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="flex items-center gap-4">
        <Avatar nome={nome} photoUrl={fotoUrl} size={72} />
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">{nome}</h1>
          <p className="text-sm text-foreground/60">{user.email}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col overflow-hidden rounded-2xl border border-border bg-white">
        <Link
          href="/perfil/meus-dados"
          className="flex items-center justify-between px-5 py-4 text-sm font-medium transition-colors hover:bg-primary-light"
        >
          Meus dados
          <span className="text-foreground/40">›</span>
        </Link>
        <a
          href={`mailto:${AJUDA_EMAIL}`}
          className="flex items-center justify-between border-t border-border px-5 py-4 text-sm font-medium transition-colors hover:bg-primary-light"
        >
          Ajuda
          <span className="text-foreground/40">›</span>
        </a>
        <Link
          href="/termos"
          className="flex items-center justify-between border-t border-border px-5 py-4 text-sm font-medium transition-colors hover:bg-primary-light"
        >
          Termos e Políticas
          <span className="text-foreground/40">›</span>
        </Link>
        <form action={sair} className="border-t border-border">
          <button
            type="submit"
            className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-error transition-colors hover:bg-error-light"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
