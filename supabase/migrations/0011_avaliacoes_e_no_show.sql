-- SaúdeAgora — beta enxuto
-- US-10 (avaliação pós-sessão) + US-13 (no-show, registro simples, sem
-- consequência financeira automatizada — não há pagamento integrado nesta
-- fase).
--
-- Sem job agendado neste beta, booking.status nunca chega a "concluído" de
-- verdade — o predicado de elegibilidade para avaliação usa
-- status = 'confirmado', e é a MESMA condição, replicada aqui na RLS, que
-- decide se o prompt de avaliação aparece na UI (/minhas-reservas). Não
-- basta checar isso só na aplicação: sem repetir a mesma janela de 3 dias e
-- o mesmo status no INSERT, um cliente poderia inserir review de um
-- booking fora da janela via chamada direta à API, contornando a tela —
-- mesma classe de risco já corrigida em outras tabelas neste projeto.

-- REVIEWS -----------------------------------------------------------------

create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id) on delete cascade,
  nota smallint not null check (nota between 1 and 5),
  comentario text,
  resposta_profissional text,
  created_at timestamptz not null default now()
);

create index reviews_booking_id_idx on reviews(booking_id);

alter table reviews enable row level security;

-- Avaliações são exibidas no perfil público do profissional (US-10) —
-- mesma regra de visibilidade pública já usada em professionals/services.
create policy "reviews_select_public" on reviews
  for select to anon, authenticated
  using (true);

-- Só o cliente dono do booking pode avaliar, e só dentro da janela real:
-- status = 'confirmado' (não existe "concluido" de verdade neste beta) e
-- no máximo 3 dias corridos após o horário do atendimento, com o horário
-- já tendo passado. Os dois lados da comparação de tempo são timestamptz
-- (instante contra instante) — mesmo padrão seguro já usado no trigger de
-- disponibilidade, nunca reformatar para data/hora local antes de comparar.
create policy "reviews_insert_own_client" on reviews
  for insert to authenticated
  with check (
    exists (
      select 1 from bookings b
      where b.id = booking_id
        and is_own_client(b.cliente_id)
        and b.status = 'confirmado'
        and b.data_hora < now()
        and now() - b.data_hora <= interval '3 days'
    )
  );

-- Profissional pode responder publicamente (US-10) — só ao próprio review,
-- e só o campo de resposta (guarda abaixo bloqueia nota/comentário).
create policy "reviews_update_own_professional_response" on reviews
  for update to authenticated
  using (
    exists (
      select 1 from bookings b
      where b.id = booking_id and is_own_professional(b.professional_id)
    )
  )
  with check (
    exists (
      select 1 from bookings b
      where b.id = booking_id and is_own_professional(b.professional_id)
    )
  );

create or replace function guard_review_professional_response() returns trigger as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if new.nota is distinct from old.nota
    or new.comentario is distinct from old.comentario
    or new.booking_id is distinct from old.booking_id then
    raise exception 'Profissional só pode alterar a resposta à avaliação.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger reviews_guard_professional_response
  before update on reviews
  for each row execute function guard_review_professional_response();

-- NO-SHOW (US-13) -----------------------------------------------------------------
--
-- Registro simples: muda o status do booking, sem cálculo de cobrança (não
-- há pagamento integrado nesta fase). Sem regra de suspensão automática
-- (3 no-shows/30 dias) — isso é lógica de negócio nova do PRD completo,
-- não beta. Sem auto-fechamento do booking pra "concluido" quando a janela
-- expira sem report — exigiria job agendado; fica como limitação conhecida
-- e documentada, não escondida: o booking permanece "confirmado"
-- indefinidamente até alguém agir manualmente.

-- Cliente precisa de permissão de UPDATE no próprio booking para poder
-- reportar "profissional não compareceu" — não existia policy de update
-- para o lado do cliente até agora (só profissional, migration 0009).
create policy "bookings_update_own_client" on bookings
  for update to authenticated
  using (is_own_client(cliente_id))
  with check (is_own_client(cliente_id));

-- Substitui o guard da 0009: agora cobre duas famílias de transição,
-- cada uma restrita a quem tem legitimidade para reportá-la e à janela de
-- 30 min após o horário agendado. now()/data_hora são os dois timestamptz
-- (instantes reais) — a mesma razão pela qual essa comparação não repete
-- o bug de fuso horário da 0010 (aquele bug era timestamptz vs. colunas
-- date/time "cruas" de availability, não existe equivalente aqui).
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

    raise exception 'Transição de status não permitida (% -> %).', old.status, new.status;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
