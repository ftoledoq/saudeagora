import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { PerfilIcons } from "@/components/perfil-icons";
import { ConfirmarAcaoButton } from "@/components/confirmar-acao-button";
import { sair, desativarConta, reativarConta, excluirContaPermanentemente } from "./actions";
import { AdicionarServicoForm } from "./adicionar-servico-form";
import { ListaServicos } from "./lista-servicos";

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
    supabase.from("professionals").select("id, nome, foto_storage_key, ativo").eq("user_id", user.id).maybeSingle(),
    supabase.from("clients").select("id, nome, ativo").eq("user_id", user.id).maybeSingle(),
  ]);

  const nome = professional?.nome ?? client?.nome ?? user.email ?? "Você";
  // Se não tem nenhuma das duas linhas (ex: só sessão órfã), trata como
  // ativo — não há o que pausar. Se tem uma das duas, o campo ativo dela é
  // que manda.
  const contaAtiva = professional?.ativo ?? client?.ativo ?? true;

  let fotoUrl: string | null = null;
  if (professional?.foto_storage_key) {
    const { data } = await supabase.storage
      .from("professional-documents")
      .createSignedUrl(professional.foto_storage_key, 300);
    fotoUrl = data?.signedUrl ?? null;
  }

  // Nota agregada, sempre sem comentário individual — mesma decisão de
  // exibição de client_reviews (migration 0024): a nota só aparece no
  // respectivo perfil de quem foi avaliado, nunca solta em outra tela.
  // Mesmo tratamento visual do perfil público do profissional
  // (src/app/profissionais/[id]/page.tsx): "Novo no SaúdeAgora" no lugar
  // de nota vazia, badge de estrelas quando já tem alguma.
  let mediaPropria: { media: number | null; total: number } | null = null;
  if (professional) {
    const { data: reviews } = await supabase.from("reviews").select("nota, booking:bookings!inner(professional_id)").eq("booking.professional_id", professional.id).returns<{ nota: number }[]>();
    const total = reviews?.length ?? 0;
    mediaPropria = {
      total,
      media: total > 0 ? reviews!.reduce((soma, r) => soma + r.nota, 0) / total : null,
    };
  } else if (client) {
    const { data } = await supabase
      .rpc("media_avaliacoes_cliente", { p_cliente_id: client.id })
      .maybeSingle<{ media: number | null; total: number }>();
    mediaPropria = data ?? { media: null, total: 0 };
  }

  let servicos: { id: string; tipo: string; preco: number; duracao_min: number }[] = [];
  if (professional) {
    const { data } = await supabase
      .from("services")
      .select("id, tipo, preco, duracao_min")
      .eq("professional_id", professional.id)
      .order("created_at");
    servicos = data ?? [];
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col px-4 py-12 sm:px-6">
      <div className="flex items-center gap-4">
        <Avatar nome={nome} photoUrl={fotoUrl} size={72} />
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">{nome}</h1>
          <p className="text-sm text-foreground/60">{user.email}</p>
          {mediaPropria && (
            <div className="mt-1.5">
              {mediaPropria.total > 0 ? (
                <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">
                  {mediaPropria.media!.toFixed(1)} ★ ({mediaPropria.total})
                </span>
              ) : (
                <span className="flex w-fit items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                  ✨ Novo no SaúdeAgora
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {!contaAtiva && (
        <div className="mt-8 rounded-2xl border border-accent bg-accent/10 p-5">
          <p className="font-display font-semibold text-accent">Sua conta está desativada</p>
          <p className="mt-1 text-sm text-foreground/70">
            {professional
              ? "Seu perfil não aparece na busca enquanto estiver desativado. "
              : ""}
            Seus dados continuam salvos — reative quando quiser.
          </p>
          <form action={reativarConta} className="mt-3">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              {PerfilIcons.play}
              Reativar conta
            </button>
          </form>
        </div>
      )}

      {contaAtiva && (
        <>
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
        </>
      )}

      {professional && contaAtiva && (
        <>
          <h2 className="mt-6 px-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Serviços
          </h2>
          <div className="mt-2 rounded-2xl border border-border bg-white p-4">
            {servicos.length === 0 ? (
              <p className="text-sm text-foreground/60">Nenhum serviço cadastrado.</p>
            ) : (
              <ListaServicos servicos={servicos} />
            )}
            <AdicionarServicoForm />
          </div>
        </>
      )}

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

      {/* Desativar (reversível, sem burocracia) é a ação principal aqui —
          por isso vem estilizada como ação neutra, não "perigosa". Excluir
          permanentemente fica visualmente menor/secundária, mas com a
          MESMA simplicidade de um clique — CDC art. 72 pune quem
          dificulta acesso/exclusão de dado do consumidor, então "menos
          destacado visualmente" nunca pode virar "mais passos". Sair fica
          sempre visível, ativa ou não — desativar não deveria tirar o
          acesso a deslogar. */}
      <div className="mt-6 flex flex-col overflow-hidden rounded-2xl border border-border bg-white">
        {contaAtiva && (
          <form action={desativarConta}>
            <ConfirmarAcaoButton
              mensagemConfirmacao="Sua conta fica pausada: sai da busca (se profissional) mas seus dados continuam salvos e você pode reativar quando quiser. Confirmar?"
              className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-medium text-foreground transition-colors hover:bg-primary-light"
            >
              <span className="text-foreground/50">{PerfilIcons.pausar}</span>
              <span>Desativar conta</span>
            </ConfirmarAcaoButton>
          </form>
        )}
        <form action={sair} className={contaAtiva ? "border-t border-border" : undefined}>
          <ConfirmarAcaoButton
            mensagemConfirmacao="Sair da sua conta?"
            className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-medium text-foreground transition-colors hover:bg-primary-light"
          >
            <span className="text-foreground/50">{PerfilIcons.sair}</span>
            <span>Sair</span>
          </ConfirmarAcaoButton>
        </form>
      </div>

      <div className="mt-4 text-center">
        <form action={excluirContaPermanentemente}>
          <ConfirmarAcaoButton
            mensagemConfirmacao="Isso encerra seu acesso e remove seus dados pessoais (nome, e-mail, foto) permanentemente — seu histórico de agendamentos é mantido, sem apontar mais para você. Não é possível desfazer. Confirmar?"
            className="text-xs font-medium text-error/70 underline-offset-2 hover:underline"
          >
            Excluir minha conta permanentemente
          </ConfirmarAcaoButton>
        </form>
      </div>

      <p className="mt-auto pt-8 text-center text-xs text-foreground/40">Versão 1.0 · Beta</p>
    </div>
  );
}
