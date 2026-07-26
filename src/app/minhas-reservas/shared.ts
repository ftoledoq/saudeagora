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
  em_andamento: "Em andamento",
  recusado: "Recusado",
  concluido: "Concluído",
  cancelado_cliente: "Cancelado (você)",
  cancelado_profissional: "Cancelado pelo profissional",
  no_show_cliente: "Você não compareceu",
  no_show_profissional: "Profissional não compareceu",
};

// Mesmo conjunto de status que libera o chat na RLS (booking_chat_liberado,
// migration 0017/0030) — 'em_andamento' também libera.
export const STATUS_LIBERA_CHAT = [
  "confirmado",
  "em_andamento",
  "concluido",
  "no_show_cliente",
  "no_show_profissional",
];

const JANELA_AVALIACAO_DIAS = 3;
const JANELA_NO_SHOW_MIN = 30;

// Gatilho agora é a CONCLUSÃO real (concluido_em, gravada pelo trigger no
// check-out do profissional), não mais o horário agendado — ver mesma
// mudança espelhada em agenda/shared.ts (elegívelParaAvaliarCliente).
export function elegívelParaAvaliar(concluidoEmIso: string | null, status: string, jaAvaliado: boolean): boolean {
  if (status !== "concluido" || jaAvaliado || !concluidoEmIso) return false;
  const minutosDesde = (Date.now() - new Date(concluidoEmIso).getTime()) / 60000;
  return minutosDesde >= 0 && minutosDesde <= JANELA_AVALIACAO_DIAS * 24 * 60;
}

// Mesma janela e condição da avaliação (status "concluido", sessão já
// aconteceu de verdade) — reaproveitada de propósito, sem schema novo.
export function elegívelParaCompartilhar(concluidoEmIso: string | null, status: string): boolean {
  if (status !== "concluido" || !concluidoEmIso) return false;
  const minutosDesde = (Date.now() - new Date(concluidoEmIso).getTime()) / 60000;
  return minutosDesde >= 0 && minutosDesde <= JANELA_AVALIACAO_DIAS * 24 * 60;
}

// Independente de check-in de propósito — continua contando só a partir do
// horário AGENDADO, nunca de um timestamp de check-in (confirmado
// explicitamente antes de implementar check-in). Já retorna false depois
// que o profissional faz check-in (status deixa de ser "confirmado"), sem
// precisar de regra nova aqui — guard_booking_status_transition não tem
// nenhuma transição de 'em_andamento' pra 'no_show_*'.
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
// tinha token equivalente ainda. "em_andamento" usa accent (laranja/coral
// de destaque já usado em avisos "acontecendo agora" no resto do app, ex:
// badge "Novo no SaúdeAgora") — precisa se distinguir claramente de
// "confirmado" (verde, ainda não começou).
export function classeBadgeStatus(status: string): string {
  if (status === "solicitado") return "bg-amber-100 text-amber-800";
  if (status === "confirmado") return "bg-primary-light text-primary";
  if (status === "em_andamento") return "bg-accent/10 text-accent";
  if (status === "concluido") return "bg-border text-foreground/70";
  if (status.startsWith("cancelado") || status.startsWith("no_show")) return "bg-error-light text-error";
  return "bg-border text-foreground/70";
}
