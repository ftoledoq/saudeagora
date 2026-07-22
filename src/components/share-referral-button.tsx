"use client";

import { useState } from "react";

export function ShareReferralButton({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  async function compartilhar() {
    const texto = "Achei profissionais de bem-estar verificados no SaúdeAgora — dá uma olhada:";
    if (navigator.share) {
      try {
        await navigator.share({ title: "SaúdeAgora", text: texto, url: link });
      } catch (err) {
        // AbortError = fechou a folha sem escolher nada, não é erro real.
        if (!(err instanceof Error && err.name === "AbortError")) {
          await copiarLink();
        }
      }
    } else {
      await copiarLink();
    }
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={compartilhar}
        className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Compartilhar link de indicação
      </button>
      {copiado && <p className="text-center text-xs text-primary">Link copiado!</p>}
    </div>
  );
}
