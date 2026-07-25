import Link from "next/link";
import { EsqueciSenhaForm } from "./esqueci-senha-form";
import { BrandMark } from "@/lib/brand-mark";

export default async function EsqueciSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <BrandMark size={36} />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
          Redefinir senha
        </h1>
        <p className="mt-2 text-sm leading-6 text-foreground/60">
          Informe o e-mail da sua conta — enviamos um link para você
          escolher uma senha nova.
        </p>
      </div>

      {erro === "link_invalido" && (
        <div className="mt-6 rounded-lg border border-error bg-error-light px-4 py-3 text-center text-sm text-error">
          Esse link expirou ou já foi usado — solicite um novo abaixo.
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-border bg-white p-6">
        <EsqueciSenhaForm />
      </div>

      <p className="mt-4 text-center text-sm text-foreground/60">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
