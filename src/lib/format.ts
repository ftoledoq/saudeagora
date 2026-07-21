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

const DIAS_SEMANA_ABREV = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

// Dia da semana a partir de uma data PURA — mesmo cuidado de formatData:
// Date.UTC(...) com os componentes já extraídos da string, nunca
// `new Date(dataIso)` direto (que interpretaria a string como ISO e traria
// o mesmo risco de fuso). getUTCDay() (não getDay()) porque construímos em
// UTC de propósito — sem isso o ambiente local do navegador/servidor
// poderia rolar o dia da semana também.
export function diaSemanaAbrev(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return DIAS_SEMANA_ABREV[data.getUTCDay()];
}

export function diaDoMes(dataIso: string): string {
  return dataIso.split("-")[2];
}
