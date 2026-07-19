"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TabItem = {
  href: string;
  label: string;
  icon: "buscar" | "agenda" | "perfil";
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
};

// Resolve o papel (cliente/profissional) inteiramente no navegador, depois
// de montar — de propósito, NÃO como Server Component lendo cookies() no
// layout raiz. Uma tab bar persistente que depende de recálculo dinâmico
// do servidor a cada navegação é recriada/reconciliada a cada troca de
// rota; isso é a causa mais provável do bug de "precisa tocar 2 vezes"
// (o nó DOM pode ser substituído no meio de um toque). Como componente
// 100% cliente, a tab bar monta uma única vez e nunca mais é recriada
// pelo roteamento.
export function TabBarClient() {
  const pathname = usePathname();
  const [agendaHref, setAgendaHref] = useState("/login?next=/agenda");
  const [perfilHref, setPerfilHref] = useState("/login?next=/perfil");

  useEffect(() => {
    let cancelado = false;
    const supabase = createClient();

    async function resolverPapel() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelado) return;

      setPerfilHref("/perfil");

      const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelado) return;

      if (professional) {
        setAgendaHref("/agenda");
        return;
      }

      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelado) setAgendaHref(client ? "/minhas-reservas" : "/login?next=/minhas-reservas");
    }

    resolverPapel();
    return () => {
      cancelado = true;
    };
  }, []);

  const items: TabItem[] = [
    { href: "/buscar", label: "Buscar", icon: "buscar" },
    { href: agendaHref, label: "Agenda", icon: "agenda" },
    { href: perfilHref, label: "Perfil", icon: "perfil" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
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
