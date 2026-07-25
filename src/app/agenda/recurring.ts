import type { SupabaseClient } from "@supabase/supabase-js";
import { hojeIsoSP } from "./grade-helpers";

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
    .select("dia_semana, hora_inicio, hora_fim, service_id")
    .eq("professional_id", professionalId);
  if (!padrao || padrao.length === 0) return;

  const { data: excecoes } = await supabase
    .from("availability_exceptions")
    .select("data")
    .eq("professional_id", professionalId);
  const datasBloqueadas = new Set((excecoes ?? []).map((e) => e.data as string));

  // Mais de uma regra pode valer pro mesmo dia da semana agora (ex: manhã
  // com um serviço, noite com outro) — por isso uma lista de regras por
  // dia, não mais uma regra única.
  const regrasPorDiaSemana = new Map<number, typeof padrao>();
  for (const regra of padrao) {
    const lista = regrasPorDiaSemana.get(regra.dia_semana as number) ?? [];
    lista.push(regra);
    regrasPorDiaSemana.set(regra.dia_semana as number, lista);
  }

  const [anoHoje, mesHoje, diaHoje] = hojeIsoSP().split("-").map(Number);
  const linhas: {
    professional_id: string;
    data: string;
    hora_inicio: string;
    hora_fim: string;
    service_id: string;
  }[] = [];
  for (let i = 0; i < HORIZONTE_SEMANAS * 7; i++) {
    const dia = new Date(Date.UTC(anoHoje, mesHoje - 1, diaHoje + i));
    const regras = regrasPorDiaSemana.get(dia.getUTCDay());
    if (!regras) continue;
    const dataIso = formatarDataISO(dia);
    if (datasBloqueadas.has(dataIso)) continue;
    for (const regra of regras) {
      linhas.push({
        professional_id: professionalId,
        data: dataIso,
        hora_inicio: regra.hora_inicio as string,
        hora_fim: regra.hora_fim as string,
        service_id: regra.service_id as string,
      });
    }
  }
  if (linhas.length === 0) return;

  await supabase
    .from("availability")
    .upsert(linhas, { onConflict: "professional_id,data,hora_inicio", ignoreDuplicates: true });
}
