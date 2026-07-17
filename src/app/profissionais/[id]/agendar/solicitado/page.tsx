import Link from "next/link";

export default async function AgendamentoSolicitadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-4 py-20 sm:px-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl text-background">
        ✓
      </span>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Solicitação enviada!
      </h1>
      <p className="text-base leading-7 text-foreground/70">
        O profissional precisa confirmar manualmente — você recebe a resposta
        assim que ele confirmar ou recusar.
      </p>
      <Link
        href={`/profissionais/${id}`}
        className="mt-2 rounded-full border border-primary px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
      >
        Voltar para o perfil
      </Link>
    </div>
  );
}
