import Link from "next/link";
import { BrandMark } from "@/lib/brand-mark";

// Navegação principal (Buscar/Agenda/Perfil) mora na tab bar inferior
// (src/components/tab-bar.tsx) — o header agora só carrega a marca e o
// CTA de captação de profissional, que não tem lugar na tab bar.
export function SiteHeader({ autenticado }: { autenticado: boolean }) {
  return (
    // Fundo sólido, não translúcido+blur — mesmo raciocínio da tab bar
    // (src/components/tab-bar-client.tsx): backdrop-filter em elemento
    // sticky/fixed é caro em mobile e pode renderizar com atraso durante o
    // scroll.
    <header className="border-b border-border bg-background sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* "/" pra quem não tem sessão (é a landing de verdade pra essa
            pessoa); "/buscar" pra quem já está logado — "/" redireciona pra
            lá de qualquer forma (ver src/app/page.tsx), então mandar direto
            evita o pulo visual de renderizar a landing por uma fração de
            segundo antes do redirect só pra sair dela de novo. */}
        <Link href={autenticado ? "/buscar" : "/"} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <BrandMark size={20} />
          </span>
          <span className="font-display text-lg tracking-tight">
            <span className="font-bold">Saúde</span>
            <span className="font-medium text-foreground/70">Agora</span>
          </span>
        </Link>

        {/* Some sempre que há sessão ativa, de qualquer tipo (profissional,
            cliente ou admin puro) — captar profissional não faz sentido
            pra quem já está logado, e o app não suporta hoje uma mesma
            pessoa ter mais de uma dessas contas simultaneamente. Checagem
            é "tem sessão?", não "tem papel?" — uma conta puramente admin
            tem sessão mas nenhum papel, e via papel sozinho o CTA
            aparecia pra ela também, mesmo bug de fundo do TabBarClient. */}
        {!autenticado && (
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
