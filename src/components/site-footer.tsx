import Link from "next/link";
import { AJUDA_EMAIL } from "@/lib/contato";

// Reescrito — a versão anterior ("Fase de validação — beta enxuto em teste
// na região piloto") era linguagem interna de projeto, não fala com quem
// está usando o produto. Estrutura mínima em blocos (identificação,
// links úteis, sobre esta fase) em vez de duas linhas soltas.
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-white">
      {/* pb-24 (não py-8) — o rodapé é sempre o último elemento antes da
          tab bar fixa (TabBar, ~60px de altura); sem esse respiro extra,
          este texto fica coberto por ela em qualquer tela curta (Login,
          Perfil). Corrigido aqui, não em cada página, porque SiteFooter é
          o único lugar que precisa saber da altura da tab bar. */}
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-10 pb-24 text-sm sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-display text-base font-semibold text-foreground">SaúdeAgora</p>
          <p className="mt-2 text-foreground/60">
            Personal trainer, massagem e pilates verificados perto de você.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground/80">Links úteis</p>
          <div className="mt-2 flex flex-col gap-1.5 text-foreground/60">
            <Link href="/termos/uso" className="hover:text-primary hover:underline">
              Termos de Uso
            </Link>
            <Link href="/termos/privacidade" className="hover:text-primary hover:underline">
              Privacidade
            </Link>
            <a href={`mailto:${AJUDA_EMAIL}`} className="hover:text-primary hover:underline">
              Ajuda
            </a>
          </div>
        </div>
        <div>
          <p className="font-semibold text-foreground/80">Sobre esta fase</p>
          <p className="mt-2 text-foreground/60">
            Estamos começando com um grupo inicial de profissionais e clientes
            nesta região — algumas funcionalidades ainda estão a caminho.
          </p>
        </div>
      </div>
    </footer>
  );
}
