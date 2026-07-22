import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { atualizarNotificacoes } from "./actions";

export default async function NotificacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil/notificacoes");

  const [{ data: professional }, { data: client }] = await Promise.all([
    supabase.from("professionals").select("notificacoes_email").eq("user_id", user.id).maybeSingle(),
    supabase.from("clients").select("notificacoes_email").eq("user_id", user.id).maybeSingle(),
  ]);
  const notificacoesAtivas = professional?.notificacoes_email ?? client?.notificacoes_email ?? true;

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        Notificações
      </span>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">Preferências de e-mail</h1>

      <form action={atualizarNotificacoes} className="mt-6 flex flex-col gap-4">
        <label className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4">
          <input
            type="checkbox"
            name="notificacoes_email"
            defaultChecked={notificacoesAtivas}
            className="mt-0.5 accent-primary"
          />
          <span className="text-sm">
            <span className="font-medium">Receber e-mail de agendamento</span>
            <span className="mt-1 block text-foreground/60">
              Novo pedido, confirmação e recusa de agendamento. Isso não
              afeta o chat, que continua funcionando normalmente.
            </span>
          </span>
        </label>

        <button
          type="submit"
          className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Salvar
        </button>
      </form>
    </div>
  );
}
