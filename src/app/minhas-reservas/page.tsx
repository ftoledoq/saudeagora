import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDataHora } from "@/lib/format";
import { reportarProfissionalNaoCompareceu } from "./actions";
import { AvaliarForm } from "./avaliar-form";

const SERVICE_LABEL: Record<string, string> = {
  personal_trainer: "Personal Trainer",
  massagem: "Massagem",
  pilates: "Pilates",
};

const STATUS_LABEL: Record<string, string> = {
  solicitado: "Solicitado",
  confirmado: "Confirmado",
  recusado: "Recusado",
  concluido: "Concluído",
  cancelado_cliente: "Cancelado (você)",
  cancelado_profissional: "Cancelado pelo profissional",
  no_show_cliente: "Você não compareceu",
  no_show_profissional: "Profissional não compareceu",
};

const JANELA_AVALIACAO_DIAS = 3;
const JANELA_NO_SHOW_MIN = 30;

function elegívelParaAvaliar(dataHoraIso: string, status: string, jaAvaliado: boolean): boolean {
  if (status !== "confirmado" || jaAvaliado) return false;
  const minutosDesde = (Date.now() - new Date(dataHoraIso).getTime()) / 60000;
  return minutosDesde >= 0 && minutosDesde <= JANELA_AVALIACAO_DIAS * 24 * 60;
}

function podeReportarNoShow(dataHoraIso: string, status: string): boolean {
  if (status !== "confirmado") return false;
  const minutosDesde = (Date.now() - new Date(dataHoraIso).getTime()) / 60000;
  return minutosDesde >= 0 && minutosDesde <= JANELA_NO_SHOW_MIN;
}

function agora(): number {
  return Date.now();
}

type BookingRow = {
  id: string;
  data_hora: string;
  status: string;
  valor: number;
  professional: { id: string; nome: string } | null;
  service: { tipo: string } | null;
  review: { id: string; nota: number; comentario: string | null } | null;
};

export default async function MinhasReservasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/minhas-reservas");

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <h1 className="font-display text-2xl font-bold">Minhas reservas</h1>
        <p className="mt-2 text-foreground/70">
          Essa área é só para clientes cadastrados.
        </p>
      </div>
    );
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, data_hora, status, valor, professional:professionals(id, nome), service:services(tipo), review:reviews(id, nota, comentario)"
    )
    .eq("cliente_id", client.id)
    .order("data_hora", { ascending: false })
    .returns<BookingRow[]>();

  const agoraMs = agora();
  const proximos = (bookings ?? []).filter((b) => new Date(b.data_hora).getTime() >= agoraMs);
  const anteriores = (bookings ?? []).filter((b) => new Date(b.data_hora).getTime() < agoraMs);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        Minhas reservas
      </span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
        Seus agendamentos
      </h1>

      {proximos.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold">Próximos</h2>
          <div className="mt-3 flex flex-col gap-3">
            {proximos.map((b) => (
              <div key={b.id} className="rounded-2xl border border-border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-semibold">{b.professional?.nome}</p>
                    <p className="text-sm text-foreground/60">
                      {b.service && (SERVICE_LABEL[b.service.tipo] ?? b.service.tipo)}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  {formatDataHora(b.data_hora)} · R$ {b.valor}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="font-display text-lg font-semibold">Anteriores</h2>
        {anteriores.length === 0 && (
          <p className="mt-2 text-sm text-foreground/60">
            Nenhum agendamento anterior ainda.
          </p>
        )}
        <div className="mt-3 flex flex-col gap-3">
          {anteriores.map((b) => {
            const avaliavel = elegívelParaAvaliar(b.data_hora, b.status, !!b.review);
            const reportavel = podeReportarNoShow(b.data_hora, b.status);

            return (
              <div key={b.id} className="rounded-2xl border border-border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-semibold">{b.professional?.nome}</p>
                    <p className="text-sm text-foreground/60">
                      {b.service && (SERVICE_LABEL[b.service.tipo] ?? b.service.tipo)}
                    </p>
                  </div>
                  <span className="rounded-full bg-border px-3 py-1 text-xs font-semibold text-foreground/70">
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  {formatDataHora(b.data_hora)} · R$ {b.valor}
                </p>

                {reportavel && (
                  <form action={reportarProfissionalNaoCompareceu} className="mt-2">
                    <input type="hidden" name="booking_id" value={b.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-error hover:underline"
                    >
                      Profissional não compareceu
                    </button>
                  </form>
                )}

                {b.review ? (
                  <p className="mt-3 border-t border-border pt-3 text-xs text-foreground/60">
                    Sua avaliação: {"★".repeat(b.review.nota)}
                    {"☆".repeat(5 - b.review.nota)}
                    {b.review.comentario && ` — ${b.review.comentario}`}
                  </p>
                ) : (
                  avaliavel && <AvaliarForm bookingId={b.id} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
