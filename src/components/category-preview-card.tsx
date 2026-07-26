// Fallback de "prévia de profissionais" pra quando ainda não há ninguém
// aprovado com serviço ativo pra mostrar — NUNCA um estado vazio dizendo
// "não temos nada" (pedido explícito, corrige o que a rodada anterior não
// aplicou). Mesma largura/formato do ProfessionalPreviewCard de propósito:
// o card real substitui este aqui sem mudar o layout ao redor assim que
// existir profissional publicado.
export type CategoryPreviewCardData = {
  tipo: string;
  nome: string;
  descricao: string;
  precoAPartir: number;
  icone: React.ReactNode;
};

export function CategoryPreviewCard({ card }: { card: CategoryPreviewCardData }) {
  return (
    <div className="flex w-48 shrink-0 flex-col rounded-2xl border border-border bg-white p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-primary">
        {card.icone}
      </span>
      <h3 className="mt-2 font-display text-sm font-semibold">{card.nome}</h3>
      <p className="mt-1 text-xs leading-5 text-foreground/60">{card.descricao}</p>
      <p className="mt-2 text-sm font-semibold text-primary">A partir de R$ {card.precoAPartir}</p>
    </div>
  );
}
