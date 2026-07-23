// Compartilhado entre a lista (page.tsx) e o detalhe ([bookingId]/page.tsx)
// — regra de elegibilidade/rótulo/cor não pode divergir entre as duas
// telas, por isso vive num lugar só.

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
  cancelado_cliente: "Cancelado (você)",
  cancelado_profissional: "Cancelado pelo profissional",
  no_show_cliente: "Você não compareceu",
  no_show_profissional: "Profissional não compareceu",
};

// Mesmo conjunto de status que libera o chat na RLS (booking_chat_liberado,
// migration 0017).
export const STATUS_LIBERA_CHAT = [
  "confirmado",
  "concluido",
  "no_show_cliente",
  "no_show_profissional",
];

const JANELA_AVALIACAO_DIAS = 3;
const JANELA_NO_SHOW_MIN = 30;

export function elegívelParaAvaliar(dataHoraIso: string, status: string, jaAvaliado: boolean): boolean {
  if (status !== "confirmado" || jaAvaliado) return false;
  const minutosDesde = (Date.now() - new Date(dataHoraIso).getTime()) / 60000;
  return minutosDesde >= 0 && minutosDesde <= JANELA_AVALIACAO_DIAS * 24 * 60;
}

// Mesma janela e condição da avaliação (status ainda "confirmado", sessão
// já deve ter acontecido) — reaproveitada de propósito, sem schema novo.
export function elegívelParaCompartilhar(dataHoraIso: string, status: string): boolean {
  if (status !== "confirmado") return false;
  const minutosDesde = (Date.now() - new Date(dataHoraIso).getTime()) / 60000;
  return minutosDesde >= 0 && minutosDesde <= JANELA_AVALIACAO_DIAS * 24 * 60;
}

export function podeReportarNoShow(dataHoraIso: string, status: string): boolean {
  if (status !== "confirmado") return false;
  const minutosDesde = (Date.now() - new Date(dataHoraIso).getTime()) / 60000;
  return minutosDesde >= 0 && minutosDesde <= JANELA_NO_SHOW_MIN;
}

// Cor por status — a Agenda do profissional hoje só distingue "pendente"
// (destaque) do resto (cinza genérico); esta é a especificação completa
// pedida (amarelo/bege=solicitado, verde=confirmado, cinza=concluído,
// vermelho/coral=cancelado/no-show), usando os tokens de cor já existentes
// no app onde dá (primary=verde da marca, error=vermelho/coral já
// definido) — só precisou de um tom âmbar novo pra "solicitado", que não
// tinha token equivalente ainda.
export function classeBadgeStatus(status: string): string {
  if (status === "solicitado") return "bg-amber-100 text-amber-800";
  if (status === "confirmado") return "bg-primary-light text-primary";
  if (status === "concluido") return "bg-border text-foreground/70";
  if (status.startsWith("cancelado") || status.startsWith("no_show")) return "bg-error-light text-error";
  return "bg-border text-foreground/70";
}
