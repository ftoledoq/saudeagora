export function LegalPageShell({
  eyebrow,
  titulo,
  children,
}: {
  eyebrow: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        {eyebrow}
      </span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">{titulo}</h1>

      <div className="mt-4 rounded-2xl border border-error bg-error-light px-4 py-3 text-sm text-error">
        <strong>Texto placeholder, pendente de validação jurídica.</strong> O
        conteúdo abaixo descreve a estrutura pretendida do documento e não
        deve ser tratado como termo legal vigente até revisão por advogado
        antes do lançamento para usuários reais.
      </div>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-7 text-foreground/80">
        {children}
      </div>
    </div>
  );
}
