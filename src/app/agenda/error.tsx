"use client";

export default function AgendaError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-error">
        Não foi possível concluir a ação
      </h1>
      <p className="mt-2 text-foreground/70">{error.message}</p>
      <button
        onClick={unstable_retry}
        className="mt-4 rounded-full border border-primary px-6 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
      >
        Tentar de novo
      </button>
    </div>
  );
}
