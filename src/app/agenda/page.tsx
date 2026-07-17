import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  adicionarDisponibilidade,
  removerDisponibilidade,
  confirmarAgendamento,
  recusarAgendamento,
} from "./actions";
import type { Availability } from "@/types/database";
import { formatDataHora } from "@/lib/format";

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
  cancelado_cliente: "Cancelado (cliente)",
  cancelado_profissional: "Cancelado (você)",
  no_show_cliente: "Cliente não compareceu",
  no_show_profissional: "Você não compareceu",
};

type BookingRow = {
  id: string;
  data_hora: string;
  status: string;
  valor: number;
  cliente: { nome: string; telefone: string } | null;
  service: { tipo: string; duracao_min: number } | null;
  endereco: {
    rua: string;
    bairro: { nome: string; cidade: string; estado: string } | null;
  } | null;
};

export default async function AgendaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/agenda");

  const { data: professional } = await supabase
    .from("professionals")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!professional) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <h1 className="font-display text-2xl font-bold">Área do profissional</h1>
        <p className="mt-2 text-foreground/70">
          Esta área é só para profissionais cadastrados.
        </p>
      </div>
    );
  }

  const [{ data: slots }, { data: bookings }] = await Promise.all([
    supabase
      .from("availability")
      .select("*")
      .eq("professional_id", professional.id)
      .gte("data", new Date().toISOString().slice(0, 10))
      .order("data")
      .order("hora_inicio")
      .returns<Availability[]>(),
    supabase
      .from("bookings")
      .select(
        "id, data_hora, status, valor, cliente:clients(nome, telefone), service:services(tipo, duracao_min), endereco:addresses(rua, bairro:bairros(nome, cidade, estado))"
      )
      .eq("professional_id", professional.id)
      .order("data_hora", { ascending: true })
      .returns<BookingRow[]>(),
  ]);

  const pendentes = (bookings ?? []).filter((b) => b.status === "solicitado");
  const outros = (bookings ?? []).filter((b) => b.status !== "solicitado");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        Sua agenda
      </span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
        Pedidos de agendamento
      </h1>
      <p className="mt-2 text-base leading-7 text-foreground/70">
        {pendentes.length} pedido(s) aguardando sua resposta.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {pendentes.length === 0 && (
          <p className="text-sm text-foreground/60">Nenhum pedido pendente agora.</p>
        )}
        {pendentes.map((b) => (
          <div key={b.id} className="rounded-2xl border border-primary bg-primary-light p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display font-semibold">{b.cliente?.nome}</p>
                <p className="text-sm text-foreground/60">{b.cliente?.telefone}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">
                {b.service && (SERVICE_LABEL[b.service.tipo] ?? b.service.tipo)}
              </span>
            </div>
            <p className="mt-3 text-sm">
              {formatDataHora(b.data_hora)} · R$ {b.valor}
            </p>
            {b.endereco && (
              <p className="mt-1 text-sm text-foreground/70">
                {b.endereco.rua}
                {b.endereco.bairro &&
                  `, ${b.endereco.bairro.nome} — ${b.endereco.bairro.cidade}/${b.endereco.bairro.estado}`}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <form action={recusarAgendamento}>
                <input type="hidden" name="id" value={b.id} />
                <button
                  type="submit"
                  className="rounded-full border border-error px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-light"
                >
                  Recusar
                </button>
              </form>
              <form action={confirmarAgendamento}>
                <input type="hidden" name="id" value={b.id} />
                <button
                  type="submit"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                >
                  Confirmar
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {outros.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-lg font-semibold">Histórico</h2>
          <div className="mt-3 flex flex-col gap-2">
            {outros.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3 text-sm"
              >
                <span>
                  {b.cliente?.nome} · {formatDataHora(b.data_hora)}
                </span>
                <span className="text-foreground/60">
                  {STATUS_LABEL[b.status] ?? b.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="font-display text-lg font-semibold">Disponibilidade</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Adicione os horários em que você está livre — só esses horários
          aparecem pro cliente na hora de agendar.
        </p>

        <form
          action={adicionarDisponibilidade}
          className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-white p-6"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="data" className="text-sm font-medium text-foreground/80">
              Data
            </label>
            <input
              id="data"
              name="data"
              type="date"
              required
              min={new Date().toISOString().slice(0, 10)}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="hora_inicio" className="text-sm font-medium text-foreground/80">
              Início
            </label>
            <input
              id="hora_inicio"
              name="hora_inicio"
              type="time"
              required
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="hora_fim" className="text-sm font-medium text-foreground/80">
              Fim
            </label>
            <input
              id="hora_fim"
              name="hora_fim"
              type="time"
              required
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Adicionar
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-2">
          {(!slots || slots.length === 0) && (
            <p className="text-sm text-foreground/60">
              Nenhum horário cadastrado ainda.
            </p>
          )}
          {slots?.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3"
            >
              <span className="text-sm">
                {s.data} · {s.hora_inicio.slice(0, 5)}–{s.hora_fim.slice(0, 5)}
              </span>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    s.status === "livre"
                      ? "bg-primary-light text-primary"
                      : "bg-border text-foreground/60"
                  }`}
                >
                  {s.status === "livre" ? "Livre" : "Reservado"}
                </span>
                {s.status === "livre" && (
                  <form action={removerDisponibilidade}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-error hover:underline"
                    >
                      Remover
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
