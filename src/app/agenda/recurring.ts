import type { SupabaseClient } from "@supabase/supabase-js";

// Sem "use server" de propósito: não é uma Server Action (não é chamada
// por um form do cliente), é uma função de servidor comum, chamada
// diretamente por outros módulos server-only (agenda/page.tsx,
// agenda/actions.ts, login/actions.ts). Um arquivo "use server" só pode
// exportar funções com assinatura de Server Action (args serializáveis) —
// esta recebe um SupabaseClient, que não serializa.

const HORIZONTE_SEMANAS = 8;

function formatarDataISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Gera os horários avulsos das próximas HORIZONTE_SEMANAS a partir do
// padrão recorrente ativo do profissional, pulando datas com exceção.
// Chamada tanto ao visitar /agenda quanto no login (não só num dos dois) —
// se o profissional não abrir o app por semanas, o horizonte esvaziaria
// silenciosamente e ele sumiria da busca sem aviso; renovar em ambos os
// pontos de entrada reduz bastante essa janela, embora não a elimine por
// completo (limitação conhecida nesta fase do beta: sem cron job, alguém
// ausente por mais que ~8 semanas sem nenhum login ainda vai esvaziar).
//
// Nunca sobrescreve uma linha que já existe: nem uma já gerada antes
// (idempotente — rodar de novo não duplica), nem uma que o trigger
// bookings_block_availability (migration 0008) já marcou 'bloqueado' por
// causa de um agendamento real. O unique index (professional_id, data,
// hora_inicio) + upsert com ignoreDuplicates garante isso — a linha
// 'bloqueado' de um booking existente nunca é tocada.
export async function renovarHorizonteDisponibilidade(
  supabase: SupabaseClient,
  professionalId: string
): Promise<void> {
  const { data: padrao } = await supabase
    .from("recurring_availability")
    .select("dia_semana, hora_inicio, hora_fim")
    .eq("professional_id", professionalId);
  if (!padrao || padrao.length === 0) return;

  const { data: excecoes } = await supabase
    .from("availability_exceptions")
    .select("data")
    .eq("professional_id", professionalId);
  const datasBloqueadas = new Set((excecoes ?? []).map((e) => e.data as string));

  const porDiaSemana = new Map(padrao.map((p) => [p.dia_semana as number, p]));

  const hoje = new Date();
  const linhas: { professional_id: string; data: string; hora_inicio: string; hora_fim: string }[] = [];
  for (let i = 0; i < HORIZONTE_SEMANAS * 7; i++) {
    const dia = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() + i));
    const regra = porDiaSemana.get(dia.getUTCDay());
    if (!regra) continue;
    const dataIso = formatarDataISO(dia);
    if (datasBloqueadas.has(dataIso)) continue;
    linhas.push({
      professional_id: professionalId,
      data: dataIso,
      hora_inicio: regra.hora_inicio as string,
      hora_fim: regra.hora_fim as string,
    });
  }
  if (linhas.length === 0) return;

  await supabase
    .from("availability")
    .upsert(linhas, { onConflict: "professional_id,data,hora_inicio", ignoreDuplicates: true });
}
