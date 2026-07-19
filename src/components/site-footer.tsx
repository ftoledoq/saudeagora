export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      {/* pb-24 (não py-8) — o rodapé é sempre o último elemento antes da
          tab bar fixa (TabBar, ~60px de altura); sem esse respiro extra,
          este texto fica coberto por ela em qualquer tela curta (Login,
          Perfil). Corrigido aqui, não em cada página, porque SiteFooter é
          o único lugar que precisa saber da altura da tab bar. */}
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-24 text-sm text-foreground/60 sm:px-6">
        <p>
          SaúdeAgora — personal trainer, massagem e pilates verificados perto
          de você.
        </p>
        <p className="mt-1">
          Fase de validação — beta enxuto em teste na região piloto.
        </p>
      </div>
    </footer>
  );
}
