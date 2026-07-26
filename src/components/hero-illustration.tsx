// Presença humana no hero (pedido explícito, item de maior impacto da
// reformulação) — sem foto real disponível nesta fase, resolvido agora
// como ilustração original (não copiada/baixada de lugar nenhum), no
// mesmo estilo hand-crafted de traço já usado na marca (BrandMark) e nos
// ícones do app (PerfilIcons): formas simples e arredondadas, sem
// tentativa de realismo anatômico — mais robusto a erro de proporção do
// que uma pose dinâmica, e ainda assim lê claramente como pessoa em
// postura de bem-estar (meditação/alongamento), servindo pra
// personal/massagem/pilates por igual, não só um dos três.
//
// O traço curto perto do ombro ecoa o "pulso" da marca (BrandMark) — a
// mesma ideia de vitalidade, não um elemento novo desconectado da
// identidade visual.
export function HeroIllustration({ size = 320 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ilustração de uma pessoa em postura de bem-estar"
    >
      {/* base — pernas cruzadas */}
      <path
        d="M32 152c10-20 30-24 68-24s58 4 68 24c-8 16-34 22-68 22s-60-6-68-22z"
        stroke="#0f6e5c"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* braço esquerdo, apoiado no joelho */}
      <path
        d="M76 74c-22 8-34 22-30 42"
        stroke="#0f6e5c"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* braço direito, apoiado no joelho */}
      <path
        d="M124 74c22 8 34 22 30 42"
        stroke="#0f6e5c"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* torso */}
      <path
        d="M80 70c-8 20-8 38 0 56h40c8-18 8-36 0-56-6-6-34-6-40 0z"
        stroke="#0f6e5c"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* cabeça */}
      <circle cx="100" cy="44" r="21" stroke="#0f6e5c" strokeWidth="3" />
      {/* pulso — mesmo motivo da marca (BrandMark), aqui como respiração/vitalidade */}
      <polyline
        points="146,96 154,96 158,88 163,104 167,96 172,96"
        stroke="#ff6b4a"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
