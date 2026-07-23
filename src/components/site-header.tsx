import Link from "next/link";
import { BrandMark } from "@/lib/brand-mark";
import type { Papel } from "@/lib/role";

// Navegação principal (Buscar/Agenda/Perfil) mora na tab bar inferior
// (src/components/tab-bar.tsx) — o header agora só carrega a marca e o
// CTA de captação de profissional, que não tem lugar na tab bar.
export function SiteHeader({ papel }: { papel: Papel }) {
  return (
    // Fundo sólido, não translúcido+blur — mesmo raciocínio da tab bar
    // (src/components/tab-bar-client.tsx): backdrop-filter em elemento
    // sticky/fixed é caro em mobile e pode renderizar com atraso durante o
    // scroll.
    <header className="border-b border-border bg-background sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <BrandMark size={20} />
          </span>
          <span className="font-display text-lg tracking-tight">
            <span className="font-bold">Saúde</span>
            <span className="font-medium text-foreground/70">Agora</span>
          </span>
        </Link>

        {/* Some sempre que há sessão ativa, de qualquer papel — captar
            profissional não faz sentido pra quem já está logado (nem como
            cliente, nem como profissional), e o app não suporta hoje uma
            mesma pessoa ter as duas contas simultaneamente. */}
        {!papel && (
          <Link
            href="/cadastro"
            className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            Sou profissional
          </Link>
        )}
      </div>
    </header>
  );
}
