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

// Mesma janela da avaliação do profissional (src/app/minhas-reservas/shared.ts)
// — espelhada aqui pro lado do profissional avaliar o cliente.
const JANELA_AVALIACAO_DIAS = 3;

export function elegívelParaAvaliarCliente(
  dataHoraIso: string,
  status: string,
  jaAvaliado: boolean
): boolean {
  if (status !== "confirmado" || jaAvaliado) return false;
  const minutosDesde = (Date.now() - new Date(dataHoraIso).getTime()) / 60000;
  return minutosDesde >= 0 && minutosDesde <= JANELA_AVALIACAO_DIAS * 24 * 60;
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

function diaSeguinte(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + 1)).toISOString().slice(0, 10);
}

// Agrupa datas consecutivas de exceção num único intervalo pra exibição
// ("28/07 – 30/07" em vez de três linhas) — a tabela continua guardando
// uma linha por dia (schema mais simples, mesmo mecanismo de sempre pra
// gerar/checar exceção), só a apresentação e a remoção em lote agrupam.
export function agruparExcecoesConsecutivas(
  excecoes: { id: string; data: string }[]
): { inicio: string; fim: string }[] {
  const ordenadas = [...excecoes].sort((a, b) => a.data.localeCompare(b.data));
  const grupos: { inicio: string; fim: string }[] = [];
  for (const exc of ordenadas) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && diaSeguinte(ultimo.fim) === exc.data) {
      ultimo.fim = exc.data;
    } else {
      grupos.push({ inicio: exc.data, fim: exc.data });
    }
  }
  return grupos;
}
