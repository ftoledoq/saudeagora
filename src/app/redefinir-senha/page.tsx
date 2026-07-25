import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RedefinirSenhaForm } from "./redefinir-senha-form";
import { BrandMark } from "@/lib/brand-mark";

export default async function RedefinirSenhaPage() {
  // A sessão de recuperação já foi trocada em auth/confirm/route.ts antes
  // de chegar aqui — se não existir (link expirado, já usado, ou alguém
  // navegando direto pra essa URL sem passar pelo link), não faz sentido
  // mostrar o formulário: a troca de senha ia falhar mesmo assim.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/esqueci-senha?erro=link_invalido");

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <BrandMark size={36} />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
          Escolha uma senha nova
        </h1>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-white p-6">
        <RedefinirSenhaForm />
      </div>
    </div>
  );
}
