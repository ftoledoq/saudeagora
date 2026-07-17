// Fuso fixo, não o do ambiente do servidor — em produção (Vercel etc.) o
// processo roda em UTC por padrão, então confiar no fuso "ambiente" gera
// exibição errada mesmo com o dado correto no banco. Região piloto inteira
// (RJ+SP) está em América/São Paulo, sem horário de verão desde 2019.
export function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}
