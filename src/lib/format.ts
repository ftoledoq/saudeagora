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

// Pra uma data PURA (coluna `date` do Postgres, "YYYY-MM-DD", sem hora nem
// fuso — ex: availability.data) — nunca passar isso por `new Date(...)` +
// timeZone como formatDataHora faz: sem componente de hora, o JS assume
// meia-noite UTC, e converter esse instante pra America/Sao_Paulo (UTC-3)
// rola pro dia anterior — é a mesma classe de bug de fuso já corrigida em
// US-07/08, só que reintroduzida por engano se essa string passar pelo
// formatador errado. Aqui é só rearranjo de texto, nenhum objeto Date
// envolvido, nenhum fuso a considerar — porque a data em si não tem fuso.
export function formatData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}
