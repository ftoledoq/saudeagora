-- SaúdeAgora — beta enxuto
-- US-09 (chat pós-agendamento), Tela 12 dos wireframes estruturais. Schema
-- segue exatamente a entidade Message do DER formal (booking_id,
-- remetente_tipo, remetente_id, conteudo, created_at + índice composto
-- (booking_id, created_at)). Chat só é liberado a partir da confirmação do
-- agendamento — nunca antes (regra de negócio já definida na US-09).
--
-- "A partir da confirmação" inclui os status que só existem porque o
-- booking já foi confirmado em algum momento (concluido, no_show_*) — uma
-- vez confirmado, o histórico de chat permanece acessível, não desaparece
-- se o status avançar depois. cancelado_* e recusado nunca chegam a
-- 'confirmado', então nunca liberam chat (correto: a US-09 é sobre
-- combinar detalhes de um atendimento que vai acontecer, não faz sentido
-- pra um pedido recusado/cancelado antes de confirmar).

create or replace function booking_chat_liberado(p_booking_id uuid) returns boolean as $$
  select exists (
    select 1 from bookings
    where id = p_booking_id
      and status in ('confirmado', 'concluido', 'no_show_cliente', 'no_show_profissional')
  );
$$ language sql security definer stable set search_path = public;

create table messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  remetente_tipo text not null check (remetente_tipo in ('cliente', 'profissional')),
  remetente_id uuid not null,
  conteudo text not null check (char_length(trim(conteudo)) > 0),
  created_at timestamptz not null default now()
);

create index messages_booking_id_created_at_idx on messages(booking_id, created_at);

alter table messages enable row level security;

-- Leitura: qualquer uma das duas partes do booking, sempre — não precisa
-- repetir booking_chat_liberado aqui porque não existe (e não pode existir,
-- pela policy de insert abaixo) mensagem anterior à confirmação.
create policy "messages_select_booking_parties" on messages
  for select to authenticated
  using (
    exists (
      select 1 from bookings b
      where b.id = booking_id
        and (is_own_client(b.cliente_id) or is_own_professional(b.professional_id))
    )
  );

-- Escrita: além de ser uma das duas partes, exige booking_chat_liberado
-- (bloqueia mensagem em pedido ainda não confirmado, mesmo via chamada
-- direta à API) e remetente_tipo/remetente_id precisam corresponder de
-- verdade à identidade autenticada — nunca confiar em valor vindo do
-- client, mesmo que o server action já monte isso corretamente hoje.
create policy "messages_insert_booking_parties" on messages
  for insert to authenticated
  with check (
    booking_chat_liberado(booking_id)
    and exists (
      select 1 from bookings b
      where b.id = booking_id
        and (
          (remetente_tipo = 'cliente' and remetente_id = b.cliente_id and is_own_client(b.cliente_id))
          or
          (remetente_tipo = 'profissional' and remetente_id = b.professional_id and is_own_professional(b.professional_id))
        )
    )
  );

-- Realtime: sem isso a UI só atualiza mensagem nova via reload manual —
-- US-09 pede atualização em tempo real (Supabase Realtime, aprovado como
-- stack de chat nesta fase em vez de serviço gerenciado de terceiro).
alter publication supabase_realtime add table messages;
