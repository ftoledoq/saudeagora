"use client";

import { useRouter } from "next/navigation";

// router.back() de verdade, não um Link fixo pra "/" — causa real do bug
// relatado (voltar sempre levava pra home, nunca pra tela de onde a pessoa
// veio). Fallback só quando não há histórico de navegação real nesta aba
// (ex: chat aberto direto por link externo/notificação, sem ter passado
// por nenhuma outra tela do app antes) — nesse caso router.back() sairia
// do app inteiro, então usamos um destino sensato em vez disso.
export function BotaoVoltar({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  function voltar() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      onClick={voltar}
      aria-label="Voltar"
      className="text-sm text-foreground/50"
    >
      ←
    </button>
  );
}
