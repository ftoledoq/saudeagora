// Helpers puros de data e layout pra grade semanal (grade-semanal.tsx) —
// server e client component usam os mesmos, então ficam separados de
// shared.ts (que é sobre bookings/avaliação, não sobre a grade em si).

// Segunda a domingo de verdade — sem isso, "semana" viraria ambíguo (a
// API do JS considera domingo o primeiro dia).
export function segundaDaSemana(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const diaSemana = data.getUTCDay(); // 0 = domingo
  const deslocamento = diaSemana === 0 ? -6 : 1 - diaSemana;
  return somarDias(dataIso, deslocamento);
}

export function somarDias(dataIso: string, dias: number): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

export function diasDaSemana(segunda: string): string[] {
  return Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
}

export function diaSemanaDe(dataIso: string): number {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

const HORA_MIN_ABSOLUTA = 6;
const HORA_MAX_ABSOLUTA = 22;

// Faixa de horas da grade: SEMPRE a faixa de sensatez inteira (6h–22h),
// nunca encolhida pro que já está configurado. Decisão revertida depois
// de uso real: encolher pro mínimo/máximo já marcado criava um paradoxo
// de gestão — um profissional sem nenhum horário ainda (conta nova, ou
// recém-limpa) via uma grade estreita (8h–20h) e não conseguia sequer
// tocar fora dela pra criar o PRIMEIRO horário mais cedo ou mais tarde,
// já que a faixa só se ajusta a partir de dado que ele não conseguia
// criar. A grade precisa estar sempre disponível pra gestão completa,
// não amarrada ao que já existe. Os únicos limites que sobram são os de
// sensatez absolutos, pra nunca esticar além de um dia de trabalho
// plausível.
export function calcularFaixaHoras(): {
  horaMin: number;
  horaMax: number;
} {
  return { horaMin: HORA_MIN_ABSOLUTA, horaMax: HORA_MAX_ABSOLUTA };
}

// Quantas linhas de hora um bloco ocupa visualmente, a partir da hora de
// fim — um serviço de 45min cabe numa linha só; um hipotético de 90min
// ocupa duas.
export function linhasQueOBlocoOcupa(horaInicioHHMM: string, horaFimHHMM: string): number {
  const horaInicio = Number(horaInicioHHMM.slice(0, 2));
  const horaFim = Number(horaFimHHMM.slice(0, 2));
  const minutoFim = Number(horaFimHHMM.slice(3, 5));
  const ultimaLinhaOcupada = minutoFim > 0 ? horaFim : horaFim - 1;
  return Math.max(1, ultimaLinhaOcupada - horaInicio + 1);
}

// Paleta fixa por índice de serviço (ordem de criação, já a mesma ordem
// usada em todo o resto da Agenda/Perfil) — cores deliberadamente fora de
// primary/accent (que já têm significado de UI — botão principal/CTA)
// pra não confundir com estado de ação.
//
// `bg` usa a MESMA cor de `dot`, só com opacidade reduzida (/15) em vez de
// um hex claro escolhido à parte — bug real relatado com captura de tela:
// o tom pastel de accent (#ffe3d9) tinha deriva perceptível pra rosa/salmão,
// não batendo com o laranja da legenda (bg-accent sólido). Opacidade sobre
// a mesma cor garante o mesmo matiz sempre, só mais claro — sem re-escolher
// um hex à mão que pode divergir visualmente do original.
export const PALETA_SERVICO = [
  { dot: "bg-primary", bg: "bg-primary-light", texto: "text-primary", borda: "border-primary" },
  { dot: "bg-accent", bg: "bg-[#ff6b4a]/15", texto: "text-accent", borda: "border-accent" },
  { dot: "bg-[#6b5b95]", bg: "bg-[#6b5b95]/15", texto: "text-[#6b5b95]", borda: "border-[#6b5b95]" },
  { dot: "bg-[#b8862c]", bg: "bg-[#b8862c]/15", texto: "text-[#b8862c]", borda: "border-[#b8862c]" },
];

export function corServico(indice: number) {
  return PALETA_SERVICO[indice % PALETA_SERVICO.length];
}

// Estado "reservado" (booking confirmado) — cinza de verdade, não o token
// `border` do design system (#e6ddd0, propositalmente quente/bege pra
// bordas). Bug real relatado: o texto da tela dizia "aparecem em cinza"
// mas a célula reservada usava bg-border, que é bege — as duas
// precisavam bater, e cinza é o que a interface já promete ao
// profissional.
export const COR_RESERVADO = {
  bg: "bg-gray-200",
  texto: "text-gray-600",
  borda: "border-gray-300",
};

export function chaveCelula(dataIso: string, horaHHMM: string): string {
  return `${dataIso}|${horaHHMM}`;
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// "22 – 28 de setembro" (mesmo mês) ou "29 de set. – 5 de out." (vira o
// mês no meio da semana) — cabeçalho de navegação da grade.
export function rotuloSemana(diasIso: string[]): string {
  const inicio = diasIso[0];
  const fim = diasIso[6];
  const [, mesInicioStr, diaInicioStr] = inicio.split("-");
  const [, mesFimStr, diaFimStr] = fim.split("-");
  const diaInicio = Number(diaInicioStr);
  const diaFim = Number(diaFimStr);
  const mesInicio = MESES[Number(mesInicioStr) - 1];
  const mesFim = MESES[Number(mesFimStr) - 1];

  if (mesInicioStr === mesFimStr) {
    return `${diaInicio} – ${diaFim} de ${mesFim}`;
  }
  return `${diaInicio} de ${mesInicio.slice(0, 3)}. – ${diaFim} de ${mesFim.slice(0, 3)}.`;
}
