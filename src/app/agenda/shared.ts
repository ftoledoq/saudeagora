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
