"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Papel } from "@/lib/role";

type TabItem = {
  href: string;
  label: string;
  icon: "buscar" | "agenda" | "perfil" | "aprovacoes";
};

const ICONS: Record<TabItem["icon"], React.ReactNode> = {
  buscar: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  agenda: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  ),
  perfil: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  ),
  aprovacoes: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
};

// `papel`, `autenticado` e `isAdmin` chegam prontos via prop, resolvidos no
// servidor pelo layout raiz (src/app/layout.tsx, via src/lib/role.ts e
// src/lib/admin.ts) antes de qualquer HTML sair — não existe nenhuma
// consulta assíncrona aqui, nem estado de "ainda resolvendo". Servidor e
// cliente sempre renderizam o mesmo href na primeira vez, então não há
// janela onde um usuário já autenticado toca um item e cai em /login por
// engano — causa raiz do bug de redirecionamento indevido relatado numa
// apresentação real.
//
// `papel` só cobre profissional/cliente (mutuamente exclusivos, ligados a
// uma linha em professionals/clients) — admin é uma permissão à parte
// (tabela `admins`), e uma conta pode ser puramente admin, sem nenhuma das
// duas outras linhas. Tratar "sem papel" como sinônimo de "deslogado" foi
// exatamente o bug relatado: Agenda/Perfil mandavam essa conta pra
// /login mesmo com sessão ativa (que por sua vez redireciona autenticado
// de volta pra "/", dando a impressão de clique não funcionando). Corrigido
// distinguindo os três estados que importam pra cada item: qual destino
// faz sentido pro papel, se a conta é admin, e se existe sessão de todo.
export function TabBarClient({
  papel,
  autenticado,
  isAdmin,
}: {
  papel: Papel;
  autenticado: boolean;
  isAdmin: boolean;
}) {
  const pathname = usePathname();

  const items: TabItem[] = [{ href: "/buscar", label: "Buscar", icon: "buscar" }];

  // "Agenda" só existe de verdade pra profissional (própria agenda) e
  // cliente (reservas) — pra admin puro, vira "Aprovações" (ponto de
  // entrada pedido explicitamente, pra não precisar digitar
  // /admin/aprovacoes de cabeça toda vez). Pra sessão autenticada sem
  // nenhum desses três papéis (não deveria existir no fluxo normal, mas o
  // orfanato de sessão é tratado com grace em /perfil) não há destino
  // sensato — o item some, em vez de cair em /login incorretamente.
  if (papel === "profissional") {
    items.push({ href: "/agenda", label: "Agenda", icon: "agenda" });
  } else if (papel === "cliente") {
    items.push({ href: "/minhas-reservas", label: "Agenda", icon: "agenda" });
  } else if (isAdmin) {
    items.push({ href: "/admin/aprovacoes", label: "Aprovações", icon: "aprovacoes" });
  } else if (!autenticado) {
    items.push({ href: "/login?next=/agenda", label: "Agenda", icon: "agenda" });
  }

  // "Perfil" é destino válido pra QUALQUER sessão autenticada, papel ou
  // não (a própria página já trata sessão órfã com grace, mostrando
  // e-mail no lugar do nome) — só quem não tem sessão nenhuma precisa
  // passar por /login primeiro.
  items.push({
    href: autenticado ? "/perfil" : "/login?next=/perfil",
    label: "Perfil",
    icon: "perfil",
  });

  return (
    // Fundo sólido opaco, não translúcido+blur: backdrop-filter em elemento
    // fixed é caro de renderizar em mobile (Safari especialmente) e pode
    // causar atraso visual perceptível durante o scroll, dando a impressão
    // de que a barra "acompanha" a rolagem em vez de ficar fixa — relatado
    // como comportamento de app amador. Sólido é imediato, sem essa dúvida.
    //
    // translateZ(0) força a barra pra sua própria camada de composição GPU
    // — isolada do repaint pesado do resto da página. Investigação de bug
    // reportado na tela de Busca ("tab bar sobrepondo o meio da lista"):
    // revisão de código e teste com scroll simulado não encontraram
    // nenhum ancestral com transform/filter/perspective quebrando o
    // containing block do position:fixed (o que causaria exatamente esse
    // sintoma) — a barra mediu corretamente fixa no rodapé do viewport em
    // todo teste que rodei. A explicação mais provável pra um sintoma real
    // em aparelho físico, que automação de navegador não reproduz, é jank
    // de repintura causado pelo carregamento de tiles do Leaflet
    // competindo pelo mesmo thread de composição durante o scroll — mesma
    // classe de problema, mitigação padrão. Não confirmado em dispositivo
    // físico; se o sintoma persistir depois deste fix, a causa é outra e
    // precisa de investigação nova, não mais deste mesmo diagnóstico.
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background"
      style={{ transform: "translateZ(0)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.icon}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                active ? "text-primary" : "text-foreground/50"
              }`}
            >
              {ICONS[item.icon]}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
