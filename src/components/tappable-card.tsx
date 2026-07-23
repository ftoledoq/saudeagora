"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

// Card com elementos interativos aninhados (link de chat, forms de
// avaliar/reportar) não pode virar um <Link> ao redor de tudo — HTML não
// permite <a>/<form> dentro de <a>. Em vez disso, o clique é interceptado
// aqui e só navega se não veio de dentro de um desses elementos.
export function TappableCard({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  function irParaDetalhe(target: EventTarget | null) {
    if (target instanceof HTMLElement && target.closest("a,button,input,textarea,form")) return;
    router.push(href);
  }

  return (
    <div
      role="link"
      tabIndex={0}
      className={className}
      onClick={(e) => irParaDetalhe(e.target)}
      onKeyDown={(e) => {
        if (e.key === "Enter") irParaDetalhe(e.target);
      }}
    >
      {children}
    </div>
  );
}
