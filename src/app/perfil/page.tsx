import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { PerfilIcons } from "@/components/perfil-icons";
import { ConfirmarAcaoButton } from "@/components/confirmar-acao-button";
import { sair, cancelarConta } from "./actions";

const AJUDA_EMAIL = "saudeagora@zohomail.com";

function ItemMenu({
  href,
  icone,
  label,
}: {
  href: string;
  icone: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-t border-border px-5 py-4 text-sm font-medium transition-colors first:border-t-0 hover:bg-primary-light"
    >
      <span className="text-foreground/50">{icone}</span>
      <span className="flex-1">{label}</span>
      <span className="text-foreground/40">›</span>
    </Link>
  );
}

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
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col px-4 py-12 sm:px-6">
      <div className="flex items-center gap-4">
        <Avatar nome={nome} photoUrl={fotoUrl} size={72} />
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">{nome}</h1>
          <p className="text-sm text-foreground/60">{user.email}</p>
        </div>
      </div>

      <h2 className="mt-8 px-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
        Conta
      </h2>
      <div className="mt-2 flex flex-col overflow-hidden rounded-2xl border border-border bg-white">
        <ItemMenu href="/perfil/meus-dados" icone={PerfilIcons.meusDados} label="Meus dados" />
        <ItemMenu href="/perfil/indicar" icone={PerfilIcons.indicar} label="Indique amigos" />
        <ItemMenu href="/perfil/seguranca" icone={PerfilIcons.seguranca} label="Segurança" />
        <ItemMenu href="/perfil/notificacoes" icone={PerfilIcons.notificacoes} label="Notificações" />
        <a
          href="/perfil/dados"
          className="flex items-center gap-3 border-t border-border px-5 py-4 text-sm font-medium transition-colors hover:bg-primary-light"
        >
          <span className="text-foreground/50">{PerfilIcons.baixar}</span>
          <span className="flex-1">Baixar meus dados</span>
          <span className="text-foreground/40">›</span>
        </a>
      </div>

      <h2 className="mt-6 px-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
        Jurídico
      </h2>
      <div className="mt-2 flex flex-col overflow-hidden rounded-2xl border border-border bg-white">
        <ItemMenu href="/termos/uso" icone={PerfilIcons.documento} label="Termos de Uso" />
        <ItemMenu href="/termos/privacidade" icone={PerfilIcons.privacidade} label="Política de Privacidade" />
        <ItemMenu href="/termos/dados" icone={PerfilIcons.dados} label="Como tratamos seus dados" />
      </div>

      <h2 className="mt-6 px-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
        Suporte
      </h2>
      <div className="mt-2 flex flex-col overflow-hidden rounded-2xl border border-border bg-white">
        <a
          href={`mailto:${AJUDA_EMAIL}`}
          className="flex items-center gap-3 px-5 py-4 text-sm font-medium transition-colors hover:bg-primary-light"
        >
          <span className="text-foreground/50">{PerfilIcons.ajuda}</span>
          <span className="flex-1">Ajuda</span>
          <span className="text-foreground/40">›</span>
        </a>
      </div>

      <div className="mt-6 flex flex-col overflow-hidden rounded-2xl border border-border bg-white">
        <form action={cancelarConta}>
          <ConfirmarAcaoButton
            mensagemConfirmacao="Isso encerra seu acesso e remove seus dados pessoais (nome, e-mail, foto) permanentemente — seu histórico de agendamentos é mantido, sem apontar mais para você. Não é possível desfazer. Confirmar?"
            className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-medium text-error transition-colors hover:bg-error-light"
          >
            <span className="text-error/70">{PerfilIcons.cancelarConta}</span>
            <span>Cancelar minha conta</span>
          </ConfirmarAcaoButton>
        </form>
        <form action={sair} className="border-t border-border">
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-medium text-error transition-colors hover:bg-error-light"
          >
            <span className="text-error/70">{PerfilIcons.sair}</span>
            <span>Sair</span>
          </button>
        </form>
      </div>

      <p className="mt-auto pt-8 text-center text-xs text-foreground/40">Versão 1.0 · Beta</p>
    </div>
  );
}
