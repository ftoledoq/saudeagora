// Marca oficial (docs/SaudeAgora/05_design/SaudeAgora_Identidade_Visual.md,
// seção 4): pino de localização com um traço de pulso cardíaco no interior.
// Compartilhado entre o header (DOM normal) e os ícones do PWA (renderizados
// via next/og/Satori) — os dois aceitam a mesma árvore JSX.
export function BrandMark({
  size = 20,
  stroke = "#0f6e5c",
  fill = "#faf7f2",
}: {
  size?: number;
  stroke?: string;
  fill?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill={fill}
      />
      <polyline
        points="6.5,9 8.5,9 9.5,6.3 11,11.7 12.5,7.5 13.5,9 17.5,9"
        fill="none"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
