"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Splash própria do app (diferente do splash nativo do PWA, que continua
// estático — limitação do sistema operacional, não dá pra animar aquele).
//
// Duração mínima curta (só o suficiente pro traço do pulso ser percebido,
// não um bloqueio de interação real) corrida em paralelo com o carregamento
// real (getSession) via Promise.all — quando a sessão resolve rápido, o
// mínimo é quem segura a splash; quando demora mais, é o carregamento real
// quem segura, sem teto artificial.
const DURACAO_MINIMA_MS = 550;
const DURACAO_FADE_MS = 300;

// sessionStorage, não um estado em memória: precisa sobreviver a um reload
// de página de verdade, que é exatamente o que acontece quando um PWA volta
// de segundo plano depois de o sistema operacional suspender/descartar o
// processo (comportamento comum em iOS/Android sob pressão de memória) —
// sessionStorage persiste nesse caso porque o navegador ainda reconhece a
// mesma aba/sessão de navegação, e só é limpo quando o app é fechado de
// verdade. Isso é o que garante "nunca reaparece em retomada de sessão já
// ativa", que uma verificação em memória (useState/useRef) não conseguiria
// cobrir, já que memória não sobrevive a um reload do processo.
const CHAVE_SESSION = "saudeagora-splash-exibida";

function splashJaExibidaNestaSessao(): boolean {
  try {
    return sessionStorage.getItem(CHAVE_SESSION) === "1";
  } catch {
    // Storage bloqueado (ex: modo privado restrito) — degrada mostrando a
    // splash de novo, nunca quebra o carregamento do app por causa disso.
    return false;
  }
}

function marcarSplashExibida() {
  try {
    sessionStorage.setItem(CHAVE_SESSION, "1");
  } catch {
    // Idem — falha silenciosa, não é crítico.
  }
}

export function SplashScreen() {
  const [pronto, setPronto] = useState(false);
  const [removido, setRemovido] = useState(false);

  // useLayoutEffect (não useEffect): precisa rodar ANTES do navegador
  // pintar o primeiro frame. Numa retomada de sessão já ativa, isso evita
  // qualquer flash visível da splash — ela nunca chega a ser pintada na
  // tela, em vez de aparecer e sumir num piscar.
  useLayoutEffect(() => {
    if (splashJaExibidaNestaSessao()) setRemovido(true);
  }, []);

  useEffect(() => {
    if (removido) return;
    let cancelado = false;
    const supabase = createClient();

    // .catch em vez de deixar a rejeição propagar: se getSession() falhar
    // (rede instável, app retomado em segundo plano com o cliente Supabase
    // num estado ruim), o Promise.all abaixo nunca resolveria — a splash
    // ficaria opaca e bloqueando cliques pra sempre, sem erro visível. Isso
    // trava QUALQUER toque na tela (não só um botão específico), o que bate
    // com o sintoma relatado de "clica e não responde".
    const carregamento = supabase.auth.getSession().catch(() => null);
    const minimo = new Promise((resolve) => setTimeout(resolve, DURACAO_MINIMA_MS));
    // Teto de segurança independente do resultado de getSession() — mesmo
    // que o .catch acima falhe por algum motivo imprevisto, isso garante
    // que a splash nunca fica presa bloqueando a tela por mais que alguns
    // segundos.
    const teto = new Promise((resolve) => setTimeout(resolve, 4000));

    Promise.race([Promise.all([carregamento, minimo]), teto]).then(() => {
      if (cancelado) return;
      setPronto(true);
      // Timeout explícito em vez de depender de onTransitionEnd — o evento
      // de transição do CSS pode não disparar de forma confiável em todo
      // navegador/contexto (ex: aba em background, transição interrompida),
      // deixando o elemento preso no DOM indefinidamente mesmo já invisível
      // (pointer-events-none evita bloquear clique, mas não é limpo).
      setTimeout(() => {
        if (!cancelado) {
          setRemovido(true);
          marcarSplashExibida();
        }
      }, DURACAO_FADE_MS);
    });

    return () => {
      cancelado = true;
    };
  }, [removido]);

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
