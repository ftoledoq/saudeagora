import Link from "next/link";
import { LoginForm } from "./login-form";
import { BrandMark } from "@/lib/brand-mark";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextParam = next ?? "/";

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      {/* Mesmo BrandMark + wordmark do header (src/components/site-header.tsx),
          só com mais destaque nesta tela — sem inventar elemento novo, sem
          gradiente, sem hero genérico. */}
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <BrandMark size={36} />
        </span>
        <h1 className="mt-4 font-display text-2xl tracking-tight">
          <span className="font-bold">Saúde</span>
          <span className="font-medium text-foreground/70">Agora</span>
        </h1>
        <p className="mt-2 text-sm leading-6 text-foreground/60">
          Acesso para clientes, profissionais e equipe interna.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-white p-6">
        <LoginForm next={nextParam} />
      </div>

      <p className="mt-4 text-sm text-foreground/60">
        Ainda não tem conta de cliente?{" "}
        <Link
          href={`/registrar?next=${encodeURIComponent(nextParam)}`}
          className="font-medium text-primary hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}
