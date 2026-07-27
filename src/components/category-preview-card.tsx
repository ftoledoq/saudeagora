import Image from "next/image";

// Fallback de "prévia de profissionais" pra quando ainda não há ninguém
// aprovado com serviço ativo pra mostrar — NUNCA um estado vazio dizendo
// "não temos nada". Mesma largura do ProfessionalPreviewCard de propósito:
// o card real substitui este aqui sem mudar o layout ao redor assim que
// existir profissional publicado.
//
// Sem preço, de propósito — decisão de posicionamento: a landing valoriza
// o serviço, não compete por preço. Preço só aparece na Busca e no perfil
// do profissional, onde a pessoa já está comparando de forma consciente.
export type CategoryPreviewCardData = {
  tipo: string;
  nome: string;
  descricao: string;
  imagemSrc: string;
  icone: React.ReactNode;
};

export function CategoryPreviewCard({ card }: { card: CategoryPreviewCardData }) {
  return (
    <div className="flex w-48 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-white">
      <div className="relative h-32 w-full">
        <Image src={card.imagemSrc} alt={card.nome} fill sizes="192px" className="object-cover" />
      </div>
      <div className="p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-primary">
          {card.icone}
        </span>
        <h3 className="mt-2 font-display text-sm font-semibold">{card.nome}</h3>
        <p className="mt-1 text-xs leading-5 text-foreground/60">{card.descricao}</p>
      </div>
    </div>
  );
}
