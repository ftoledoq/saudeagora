import Link from "next/link";

export default function CadastroRecebidoPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-4 py-20 sm:px-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl text-background">
        ✓
      </span>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Cadastro recebido!
      </h1>
      <p className="text-base leading-7 text-foreground/70">
        Vamos analisar seus documentos e dados manualmente. Você recebe uma
        resposta em até <strong>24h úteis</strong>. Assim que for aprovado,
        seu perfil passa a aparecer nas buscas.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full border border-primary px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
      >
        Voltar para o início
      </Link>
    </div>
  );
}
