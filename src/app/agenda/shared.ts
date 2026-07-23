// Compartilhado entre a lista (page.tsx) e o detalhe ([bookingId]/page.tsx)
// — mesmo raciocínio do src/app/minhas-reservas/shared.ts: rótulo/janela
// não pode divergir entre as duas telas.

export const SERVICE_LABEL: Record<string, string> = {
  personal_trainer: "Personal Trainer",
  massagem: "Massagem",
  pilates: "Pilates",
};

export const STATUS_LABEL: Record<string, string> = {
  solicitado: "Solicitado",
  confirmado: "Confirmado",
  recusado: "Recusado",
  concluido: "Concluído",
  cancelado_cliente: "Cancelado (cliente)",
  cancelado_profissional: "Cancelado (você)",
  no_show_cliente: "Cliente não compareceu",
  no_show_profissional: "Você não compareceu",
};

// Mesmo conjunto de status que libera o chat na RLS (booking_chat_liberado,
// migration 0017).
export const STATUS_LIBERA_CHAT = [
  "confirmado",
  "concluido",
  "no_show_cliente",
  "no_show_profissional",
];

const JANELA_NO_SHOW_MIN = 30;

export function podeReportarNoShow(dataHoraIso: string, status: string): boolean {
  if (status !== "confirmado") return false;
  const minutosDesde = (Date.now() - new Date(dataHoraIso).getTime()) / 60000;
  return minutosDesde >= 0 && minutosDesde <= JANELA_NO_SHOW_MIN;
}

// Soma minutos a "HH:MM", sem depender de Date (mesmo cuidado de fuso já
// documentado em src/lib/format.ts) — só aritmética de string. Usado tanto
// no horário avulso quanto no padrão recorrente, sempre pra calcular "Fim"
// a partir da duração do serviço, nunca digitado à mão.
export function somarMinutos(horaInicio: string, minutos: number): string {
  const [h, m] = horaInicio.split(":").map(Number);
  const totalMin = h * 60 + m + minutos;
  const hFim = Math.floor(totalMin / 60) % 24;
  const mFim = totalMin % 60;
  return `${String(hFim).padStart(2, "0")}:${String(mFim).padStart(2, "0")}`;
}

// Mesma convenção de src/lib/format.ts (diaSemanaAbrev/getUTCDay):
// 0 = domingo ... 6 = sábado. Ordem de exibição no seletor é
// segunda-primeiro (S T Q Q S S D), por isso a lista de exibição abaixo
// não segue a ordem numérica.
export const DIA_SEMANA_ABREV: Record<number, string> = {
  0: "D",
  1: "S",
  2: "T",
  3: "Q",
  4: "Q",
  5: "S",
  6: "S",
};

export const DIA_SEMANA_NOME: Record<number, string> = {
  0: "domingo",
  1: "segunda",
  2: "terça",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sábado",
};

// Segunda(1) a domingo(0), pra exibição — a ordem numérica nativa (getUTCDay)
// começa no domingo, que não é como profissional brasileiro pensa a semana.
export const ORDEM_EXIBICAO_DIAS = [1, 2, 3, 4, 5, 6, 0];

// "Segunda e quarta, 8h-12h" — agrupa os dias que compartilham o mesmo
// horário (hoje sempre são todos, já que o padrão tem um único horário
// pra todos os dias selecionados, mas a função não assume isso).
export function textoPadraoRecorrente(
  regras: { dia_semana: number; hora_inicio: string; hora_fim: string }[]
): string {
  if (regras.length === 0) return "";
  const porHorario = new Map<string, number[]>();
  for (const r of regras) {
    const chave = `${r.hora_inicio}-${r.hora_fim}`;
    const dias = porHorario.get(chave) ?? [];
    dias.push(r.dia_semana);
    porHorario.set(chave, dias);
  }
  return Array.from(porHorario.entries())
    .map(([chave, dias]) => {
      const [inicio, fim] = chave.split("-");
      const diasOrdenados = ORDEM_EXIBICAO_DIAS.filter((d) => dias.includes(d));
      const nomes = diasOrdenados.map((d) => DIA_SEMANA_NOME[d]);
      const listaDias =
        nomes.length <= 1
          ? nomes.join("")
          : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
      return `${listaDias.charAt(0).toUpperCase()}${listaDias.slice(1)}, ${inicio.slice(0, 5)}-${fim.slice(0, 5)}`;
    })
    .join(" · ");
}
