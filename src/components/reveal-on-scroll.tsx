"use client";

import { useEffect, useRef, useState } from "react";

// Movimento com função: sinaliza "isto é um produto, não um documento
// estático" — não decoração por decoração. Fade + slide curto (16px, 700ms)
// só na primeira vez que a seção entra na tela (IntersectionObserver
// desconecta depois de disparar, não repete ao rolar pra cima e voltar).
// Respeita prefers-reduced-motion: quem desativa animação no sistema
// operacional recebe o conteúdo já visível, sem transição nenhuma — nunca
// forçado.
export function RevealOnScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisivel(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisivel(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visivel ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
