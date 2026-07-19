"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Splash própria do app (diferente do splash nativo do PWA, que continua
// estático — limitação do sistema operacional, não dá pra animar aquele).
// Mostrada uma única vez, na primeira montagem do layout raiz (que persiste
// entre navegações client-side no App Router) — nunca reaparece ao trocar
// de rota dentro do app, só numa carga de página nova de verdade.
//
// Duração mínima de 1.2s (tempo pro traço do pulso ser percebido) corrida em
// paralelo com o carregamento real (getSession) — não em série, e não um
// timer fixo sozinho: quando a sessão resolve rápido (comum, lê de storage
// local), o mínimo é quem segura a splash; quando a sessão demora mais que
// 1.2s, o mínimo já passou e é o carregamento real quem segura. Nenhum dos
// dois é descartado, os dois precisam terminar — sem teto artificial.
const DURACAO_MINIMA_MS = 1200;
const DURACAO_FADE_MS = 300;

export function SplashScreen() {
  const [pronto, setPronto] = useState(false);
  const [removido, setRemovido] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const supabase = createClient();

    const carregamento = supabase.auth.getSession();
    const minimo = new Promise((resolve) => setTimeout(resolve, DURACAO_MINIMA_MS));

    Promise.all([carregamento, minimo]).then(() => {
      if (cancelado) return;
      setPronto(true);
      // Timeout explícito em vez de depender de onTransitionEnd — o evento
      // de transição do CSS pode não disparar de forma confiável em todo
      // navegador/contexto (ex: aba em background, transição interrompida),
      // deixando o elemento preso no DOM indefinidamente mesmo já invisível
      // (pointer-events-none evita bloquear clique, mas não é limpo).
      setTimeout(() => {
        if (!cancelado) setRemovido(true);
      }, DURACAO_FADE_MS);
    });

    return () => {
      cancelado = true;
    };
  }, []);

  if (removido) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-primary transition-opacity duration-300 ${
        pronto ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <svg width="88" height="88" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
          fill="#faf7f2"
        />
        <polyline
          points="6.5,9 8.5,9 9.5,6.3 11,11.7 12.5,7.5 13.5,9 17.5,9"
          pathLength="100"
          fill="none"
          stroke="#0f6e5c"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="100"
          style={{ animation: "splash-pulse-draw 1.8s ease-in-out infinite" }}
        />
      </svg>
      <p className="font-display text-xl tracking-tight text-background">
        <span className="font-bold">Saúde</span>
        <span className="font-medium text-background/70">Agora</span>
      </p>
    </div>
  );
}
