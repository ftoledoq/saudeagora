"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Splash própria do app (diferente do splash nativo do PWA, que continua
// estático — limitação do sistema operacional, não dá pra animar aquele).
// Mostrada uma única vez, na primeira montagem do layout raiz (que persiste
// entre navegações client-side no App Router) — nunca reaparece ao trocar
// de rota dentro do app, só numa carga de página nova de verdade.
//
// De propósito, sem duração fixa arbitrária: some assim que a sessão inicial
// (getSession, primeira leitura real de dados que o app precisa) resolver,
// não depois de um setTimeout artificial. getSession() lê de storage local
// primeiro (rápido) mas ainda é a leitura real que o resto do app depende —
// não é um placeholder de espera.
export function SplashScreen() {
  const [pronto, setPronto] = useState(false);
  const [removido, setRemovido] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const supabase = createClient();

    supabase.auth.getSession().then(() => {
      if (!cancelado) setPronto(true);
    });

    return () => {
      cancelado = true;
    };
  }, []);

  if (removido) return null;

  return (
    <div
      aria-hidden="true"
      onTransitionEnd={() => {
        if (pronto) setRemovido(true);
      }}
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
