"use client";

import { useState } from "react";
import { PerfilIcons } from "@/components/perfil-icons";

// Era um <a href="/perfil/dados"> comum — a rota (Content-Disposition:
// attachment) funciona certinho testada direto (confirmado: volta 200/401
// como esperado), mas o app roda em display: "standalone" (manifest.ts,
// instalado na tela inicial) e o WebKit em modo standalone não tem UI de
// gerenciador de download nesse contexto — o toque não visivelmente fazia
// nada, batendo com o relato de "não funcional". Buscar via fetch + Blob +
// <a download> temporário é o jeito confiável de disparar download dentro
// de um PWA instalado, nos dois contextos (navegador normal e standalone).
// Formato do arquivo em si não muda nada — mesmo JSON bruto de sempre, só
// o gatilho do download é diferente.
export function BaixarDadosButton() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function baixar() {
    setErro(null);
    setCarregando(true);
    try {
      const resposta = await fetch("/perfil/dados");
      if (!resposta.ok) throw new Error("Não foi possível gerar o arquivo.");
      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "saudeagora-meus-dados.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErro("Não foi possível baixar seus dados agora. Tente de novo em instantes.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={baixar}
        disabled={carregando}
        className="flex w-full items-center gap-3 border-t border-border px-5 py-4 text-left text-sm font-medium transition-colors hover:bg-primary-light disabled:opacity-60"
      >
        <span className="text-foreground/50">{PerfilIcons.baixar}</span>
        <span className="flex-1">{carregando ? "Preparando..." : "Baixar meus dados"}</span>
        <span className="text-foreground/40">›</span>
      </button>
      {erro && <p className="px-5 pb-3 text-xs text-error">{erro}</p>}
    </div>
  );
}
