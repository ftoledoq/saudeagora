// Feedback visual mínimo pra navegação client-side entre rotas dinâmicas —
// sem isso a tela fica "congelada" durante o tempo de carregamento real
// (medido em produção: pode passar de 1s), o que faz a pessoa achar que o
// toque não funcionou e tocar de novo. Next.js troca isso automaticamente
// pelo conteúdo real assim que a rota carrega (arquivo loading.tsx).
export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse px-4 py-12 sm:px-6">
      <div className="h-5 w-32 rounded-full bg-border" />
      <div className="mt-3 h-8 w-2/3 rounded-lg bg-border" />
      <div className="mt-8 flex flex-col gap-3">
        <div className="h-20 rounded-2xl bg-border" />
        <div className="h-20 rounded-2xl bg-border" />
        <div className="h-20 rounded-2xl bg-border" />
      </div>
    </div>
  );
}
