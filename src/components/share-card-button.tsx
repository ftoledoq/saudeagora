"use client";

import { useState } from "react";
import { gerarImagemCardAtendimento } from "@/lib/share-card";

export function ShareCardButton({
  profissionalNome,
  servicoTipo,
  dataHoraIso,
}: {
  profissionalNome: string;
  servicoTipo: string;
  dataHoraIso: string;
}) {
  const [estado, setEstado] = useState<"idle" | "gerando" | "erro">("idle");

  async function compartilhar() {
    setEstado("gerando");
    try {
      const blob = await gerarImagemCardAtendimento({ profissionalNome, servicoTipo, dataHoraIso });
      const arquivo = new File([blob], "saudeagora-atendimento.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({
          files: [arquivo],
          title: "SaúdeAgora",
          text: `Acabei de treinar com ${profissionalNome} pelo SaúdeAgora!`,
        });
      } else {
        // Sem suporte a compartilhamento de arquivo (a maioria dos
        // navegadores desktop) — baixa a imagem, sem depender de nenhum
        // serviço externo.
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "saudeagora-atendimento.png";
        link.click();
        URL.revokeObjectURL(url);
      }
      setEstado("idle");
    } catch (err) {
      // AbortError acontece quando a pessoa fecha a folha de compartilhar
      // sem escolher nada — não é erro de verdade, não precisa de mensagem.
      if (err instanceof Error && err.name === "AbortError") {
        setEstado("idle");
        return;
      }
      setEstado("erro");
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={compartilhar}
        disabled={estado === "gerando"}
        className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {estado === "gerando" ? "Gerando..." : "📤 Compartilhar"}
      </button>
      {estado === "erro" && (
        <p className="mt-1 text-xs text-error">Não foi possível gerar a imagem agora.</p>
      )}
    </div>
  );
}
