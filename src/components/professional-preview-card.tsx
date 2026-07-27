import Link from "next/link";
import { Avatar } from "@/components/avatar";

// Extraído do card "Perto de você" da Busca (src/app/buscar/visao-busca.tsx)
// — mesmo componente, dois lugares (Busca e landing), não uma cópia visual
// só parecida. Landing acrescenta o selo Verificado (a Busca não precisa,
// já é óbvio pelo contexto de estar dentro do fluxo de busca).
export type ProfessionalPreviewCardData = {
  key: string;
  professionalId: string;
  nome: string;
  fotoUrl: string | null;
  servicoLabel: string;
  preco: number;
  avaliacaoLabel: string | null;
  distanciaLabel: string | null;
};

export function ProfessionalPreviewCard({
  card,
  mostrarVerificado = false,
  mostrarPreco = true,
}: {
  card: ProfessionalPreviewCardData;
  mostrarVerificado?: boolean;
  // A landing não mostra preço (decisão de posicionamento: valoriza o
  // serviço, não compete por preço) — só a Busca e o perfil do
  // profissional, onde a pessoa já está comparando de forma consciente.
  mostrarPreco?: boolean;
}) {
  return (
    <Link
      href={`/profissionais/${card.professionalId}`}
      className="flex w-48 shrink-0 flex-col rounded-2xl border border-border bg-white p-4 transition-colors hover:border-primary"
    >
      <div className="flex items-center gap-2">
        <Avatar nome={card.nome} photoUrl={card.fotoUrl} size={36} />
        <span className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold text-primary">
          {card.servicoLabel}
        </span>
      </div>
      <h3 className="mt-2 font-display text-sm font-semibold">{card.nome}</h3>
      {mostrarVerificado && (
        <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-primary">
          ✓ Verificado
        </span>
      )}
      {card.avaliacaoLabel && <p className="mt-0.5 text-xs text-primary">{card.avaliacaoLabel}</p>}
      {card.distanciaLabel && <p className="mt-1 text-xs text-foreground/60">{card.distanciaLabel}</p>}
      {mostrarPreco && <p className="mt-1 text-sm font-semibold text-primary">R$ {card.preco}</p>}
    </Link>
  );
}
