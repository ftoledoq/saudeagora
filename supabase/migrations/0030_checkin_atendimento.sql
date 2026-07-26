-- SaúdeAgora — beta enxuto
-- Check-in de atendimento: novo status 'em_andamento' entre 'confirmado' e
-- 'concluido'. Profissional inicia (dentro de uma janela perto do horário
-- agendado) e conclui (sem limite de tempo) manualmente — sem GPS/tempo
-- real, decisão de escopo já tomada.
--
-- Impacto mapeado antes de codificar (ver conversa): CHECK de status,
-- guard_booking_status_transition, RLS de avaliação (reviews e
-- client_reviews), booking_chat_liberado, atendimentos_realizados_count.
-- bookings_no_conflito (migration 0008) NÃO muda — já é uma lista
-- NEGATIVA (recusado/cancelado_*), então 'em_andamento' já conta como
-- "ativo" e continua segurando o horário sem precisar de alteração.

-- COLUNAS -------------------------------------------------------------------

alter table bookings add column iniciado_em timestamptz;
alter table bookings add column concluido_em timestamptz;

-- CHECK de status -------------------------------------------------------------
-- Constraint inline da CREATE TABLE original (0008) não tem nome explícito
-- — busca dinâmica em vez de assumir o nome default do Postgres, mesmo
-- cuidado já usado na 0027 pro índice único de recurring_availability.
do $$
declare
  nome_constraint text;
begin
  select conname into nome_constraint
  from pg_constraint
  where conrelid = 'bookings'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';
  if nome_constraint is not null then
    execute format('alter table bookings drop constraint %I', nome_constraint);
  end if;
end $$;

alter table bookings add constraint bookings_status_check check (
  status in (
    'solicitado', 'confirmado', 'em_andamento', 'concluido',
    'cancelado_cliente', 'cancelado_profissional',
    'no_show_cliente', 'no_show_profissional'
  )
);

-- TRANSIÇÃO DE STATUS ---------------------------------------------------------
-- Substitui a versão da 0011: mantém as duas famílias já existentes
-- (solicitado->confirmado/recusado, confirmado->no_show_* na janela de 30
-- min) e adiciona duas novas.
--
-- iniciado_em/concluido_em são sempre now() do servidor, nunca um valor
-- vindo do cliente — sobrescritos aqui de propósito em QUALQUER update,
-- não só nas duas transições novas, pra essas colunas nunca poderem ser
-- forjadas por uma chamada direta à API que não mude o status (o guard
-- original só validava algo quando new.status is distinct from old.status;
-- um update que preserva o status passava direto sem nenhuma checagem).
create or replace function guard_booking_status_transition() returns trigger as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.status is distinct from old.status then
    if old.status = 'solicitado'
      and new.status in ('confirmado', 'recusado')
      and is_own_professional(new.professional_id) then
      return new;
    end if;

    if old.status = 'confirmado'
      and old.data_hora < now()
      and now() - old.data_hora <= interval '30 minutes' then
      if new.status = 'no_show_cliente' and is_own_professional(new.professional_id) then
        return new;
      end if;
      if new.status = 'no_show_profissional' and is_own_client(new.cliente_id) then
        return new;
      end if;
    end if;

    -- Check-in: só o profissional dono, só saindo de 'confirmado', só
    -- dentro de 15 min antes até 30 min depois do horário agendado (mesma
    -- janela usada na UI pra habilitar o botão — ver JANELA_CHECKIN_* em
    -- agenda/shared.ts). Nunca a partir de 'em_andamento' de novo, nem de
    -- qualquer outro status — reforça que check-in não substitui no-show
    -- nem é reversível por aqui.
    if old.status = 'confirmado'
      and new.status = 'em_andamento'
      and is_own_professional(new.professional_id)
      and now() >= old.data_hora - interval '15 minutes'
      and now() <= old.data_hora + interval '30 minutes' then
      new.iniciado_em := now();
      return new;
    end if;

    -- Concluir: só o profissional dono, só saindo de 'em_andamento', sem
    -- limite de tempo (decisão confirmada: não bloquear por duração
    -- anômala — só manter o timestamp real pra eventual revisão manual
    -- futura se a duração fugir do esperado).
    if old.status = 'em_andamento'
      and new.status = 'concluido'
      and is_own_professional(new.professional_id) then
      new.concluido_em := now();
      return new;
    end if;

    raise exception 'Transição de status não permitida (% -> %).', old.status, new.status;
  end if;

  -- Status não mudou nesta UPDATE (ex: profissional respondendo uma
  -- avaliação não mexe em bookings, mas qualquer futuro update que
  -- preserve o status cai aqui) — preserva iniciado_em/concluido_em
  -- como estavam, descartando qualquer valor que o cliente tenha
  -- mandado pra essas duas colunas.
  new.iniciado_em := old.iniciado_em;
  new.concluido_em := old.concluido_em;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- AVALIAÇÃO: gatilho passa de "horário agendado + 3 dias" pra "conclusão
-- real + 3 dias" ------------------------------------------------------------
-- status = 'confirmado' + data_hora vira status = 'concluido' +
-- concluido_em nas duas RLS (cliente avalia profissional, profissional
-- avalia cliente). concluido_em nunca é futuro (é sempre now() no momento
-- da transição, gravado pelo trigger acima) — por isso não precisa mais do
-- "b.data_hora < now()" que a versão antiga tinha (aquilo existia só
-- porque comparar com o horário AGENDADO exigia garantir que ele já tinha
-- passado; concluido_em já implica isso por construção).

drop policy if exists "reviews_insert_own_client" on reviews;
create policy "reviews_insert_own_client" on reviews
  for insert to authenticated
  with check (
    exists (
      select 1 from bookings b
      where b.id = booking_id
        and is_own_client(b.cliente_id)
        and b.status = 'concluido'
        and b.concluido_em is not null
        and now() - b.concluido_em <= interval '3 days'
    )
  );

drop policy if exists "client_reviews_insert_own_professional" on client_reviews;
create policy "client_reviews_insert_own_professional" on client_reviews
  for insert to authenticated
  with check (
    exists (
      select 1 from bookings b
      where b.id = booking_id
        and is_own_professional(b.professional_id)
        and b.status = 'concluido'
        and b.concluido_em is not null
        and now() - b.concluido_em <= interval '3 days'
    )
  );

-- CHAT: 'em_andamento' também libera (sessão em curso precisa continuar
-- podendo trocar mensagem, mesmo raciocínio de 'confirmado') -----------------
create or replace function booking_chat_liberado(p_booking_id uuid) returns boolean as $$
  select exists (
    select 1 from bookings
    where id = p_booking_id
      and status in ('confirmado', 'em_andamento', 'concluido', 'no_show_cliente', 'no_show_profissional')
  );
$$ language sql security definer stable set search_path = public;

-- CONTADOR PÚBLICO: remove a gambiarra documentada -----------------------
-- Antes usava "confirmado + data_hora < now()" como proxy pra "sessão já
-- deve ter acontecido", porque nada nunca marcava 'concluido' de verdade
-- neste beta. Agora que existe conclusão real, a contagem vira só
-- status = 'concluido', sem heurística.
create or replace function atendimentos_realizados_count(p_professional_id uuid) returns integer as $$
  select count(*)::integer from bookings
  where professional_id = p_professional_id
    and status = 'concluido';
$$ language sql security definer stable set search_path = public;
