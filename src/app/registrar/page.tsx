import { RegistrarForm } from "./registrar-form";

export default async function RegistrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; ref?: string }>;
}) {
  const { next, ref } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Criar conta</h1>
      <p className="mt-2 text-base leading-7 text-foreground/70">
        Rápido — só o necessário para agendar.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-white p-6">
        <RegistrarForm next={next ?? "/"} ref={ref ?? null} />
      </div>
    </div>
  );
}
