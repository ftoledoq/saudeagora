// Mesmo estilo de ícone já usado na tab bar (src/components/tab-bar-client.tsx):
// stroke inline, 20px, currentColor, strokeWidth 2 — sem introduzir
// biblioteca de ícones nova.
const props = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const PerfilIcons = {
  meusDados: (
    <svg {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  ),
  indicar: (
    <svg {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.5 15.4 6.5M8.6 13.5 15.4 17.5" />
    </svg>
  ),
  seguranca: (
    <svg {...props}>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  notificacoes: (
    <svg {...props}>
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  ),
  baixar: (
    <svg {...props}>
      <path d="M12 4v11M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  ),
  documento: (
    <svg {...props}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </svg>
  ),
  privacidade: (
    <svg {...props}>
      <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6z" />
    </svg>
  ),
  dados: (
    <svg {...props}>
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v14c0 1.66 3.13 3 7 3s7-1.34 7-3V5" />
      <path d="M5 12c0 1.66 3.13 3 7 3s7-1.34 7-3" />
    </svg>
  ),
  ajuda: (
    <svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  cancelarConta: (
    <svg {...props}>
      <path d="M9 6V4h6v2" />
      <path d="M5 6h14" />
      <path d="M7 6l1 14h8l1-14" />
    </svg>
  ),
  pausar: (
    <svg {...props}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  ),
  play: (
    <svg {...props}>
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  ),
  sair: (
    <svg {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
};
