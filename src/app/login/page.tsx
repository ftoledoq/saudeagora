import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextParam = next ?? "/";

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Entrar</h1>
      <p className="mt-2 text-base leading-7 text-foreground/70">
        Acesso para clientes, profissionais e equipe interna.
      </p>

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
