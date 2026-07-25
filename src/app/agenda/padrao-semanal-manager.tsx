"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { salvarPadraoRecorrente, removerGrupoPadrao } from "./actions";
import { SeletorDiasSemana } from "./seletor-dias-semana";
import { DIA_SEMANA_ABREV, ORDEM_EXIBICAO_DIAS, SERVICE_LABEL, textoDiasEHorario, type GrupoPadrao } from "./shared";

type Servico = { id: string; tipo: string; duracao_min: number };

type State = { error: string | null; sucessoEm: number | null };
const initialState: State = { error: null, sucessoEm: null };

async function action(_prev: State, formData: FormData): Promise<State> {
  const resultado = await salvarPadraoRecorrente(formData);
  return { error: resultado.error, sucessoEm: resultado.error ? null : Date.now() };
}

// Antes disso só existia UM padrão por profissional (salvar sempre
// substituía tudo) — lacuna real corrigida na migration 0027: agora cada
// padrão é um grupo independente (dias + horário + serviço), que pode
// conviver com outros grupos em dias/horários diferentes, ser editado
// sem apagar os outros, ou removido sozinho.
export function PadraoSemanalManager({
  grupos,
  servicos,
}: {
  grupos: GrupoPadrao[];
  servicos: Servico[];
}) {
  const [editandoGrupoId, setEditandoGrupoId] = useState<string | null>(null);
  const grupoEmEdicao = grupos.find((g) => g.grupoId === editandoGrupoId) ?? null;
  const [formVisivel, setFormVisivel] = useState(false);

  const [state, formAction, pending] = useActionState(action, initialState);
  const ultimoSucesso = useRef<number | null>(null);

  useEffect(() => {
    if (state.sucessoEm && state.sucessoEm !== ultimoSucesso.current) {
      ultimoSucesso.current = state.sucessoEm;
      setFormVisivel(false);
      setEditandoGrupoId(null);
    }
  }, [state.sucessoEm]);

  function iniciarEdicao(grupo: GrupoPadrao) {
    setEditandoGrupoId(grupo.grupoId);
    setFormVisivel(true);
  }

  function iniciarNovo() {
    setEditandoGrupoId(null);
    setFormVisivel(true);
  }

  return (
    <div>
      {grupos.length > 0 ? (
        <div className="flex flex-col gap-2">
          {grupos.map((g) => {
            const servico = servicos.find((s) => s.id === g.serviceId);
            return (
              <div
                key={g.grupoId}
                className="flex items-center justify-between gap-2 rounded-xl border border-primary bg-primary-light px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-primary">
                    {textoDiasEHorario(g.dias, g.horaInicio, g.horaFim)}
                  </span>
                  {servico && (
                    <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {SERVICE_LABEL[servico.tipo] ?? servico.tipo}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => iniciarEdicao(g)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Editar
                  </button>
                  <form action={removerGrupoPadrao}>
                    <input type="hidden" name="grupo_id" value={g.grupoId} />
                    <button type="submit" className="text-xs font-medium text-error hover:underline">
                      Remover
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-foreground/60">Nenhum padrão semanal ativo.</p>
      )}

      {!formVisivel && (
        <button
          type="button"
          onClick={iniciarNovo}
          className="mt-3 text-sm font-medium text-primary hover:underline"
        >
          + Adicionar padrão
        </button>
      )}

      {formVisivel && (
        <form
          key={editandoGrupoId ?? "novo"}
          action={formAction}
          className="mt-3 flex flex-col gap-4 rounded-2xl border border-border bg-white p-6"
        >
          {state.error && <p className="text-xs text-error">{state.error}</p>}
          {grupoEmEdicao && <input type="hidden" name="grupo_id" value={grupoEmEdicao.grupoId} />}

          <div>
            <p className="text-sm font-medium text-foreground/80">Dias da semana</p>
            <SeletorDiasSemana
              ordemExibicao={ORDEM_EXIBICAO_DIAS}
              abreviacoes={DIA_SEMANA_ABREV}
              diasIniciais={grupoEmEdicao?.dias}
            />
          </div>

          {servicos.length > 1 ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="padrao_service_id" className="text-sm font-medium text-foreground/80">
                Serviço
              </label>
              <select
                id="padrao_service_id"
                name="service_id"
                required
                defaultValue={grupoEmEdicao?.serviceId ?? servicos[0]?.id}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                {servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {SERVICE_LABEL[s.tipo] ?? s.tipo} ({s.duracao_min} min)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="service_id" value={servicos[0]?.id ?? ""} />
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="padrao_hora_inicio" className="text-sm font-medium text-foreground/80">
                Início
              </label>
              <input
                id="padrao_hora_inicio"
                name="hora_inicio"
                type="time"
                required
                placeholder="08:00"
                defaultValue={grupoEmEdicao?.horaInicio.slice(0, 5)}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
              />
            </div>
            {servicos.length === 1 && (
              <p className="pb-2.5 text-sm text-foreground/60">
                Duração: {servicos[0].duracao_min} min (definida no seu cadastro)
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? "Salvando..." : grupoEmEdicao ? "Salvar alterações" : "Salvar padrão"}
            </button>
            <button
              type="button"
              onClick={() => setFormVisivel(false)}
              className="pb-2.5 text-sm font-medium text-foreground/60 hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
