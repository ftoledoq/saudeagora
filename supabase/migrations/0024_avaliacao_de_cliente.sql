-- SaúdeAgora — beta enxuto
-- Espelha a avaliação já existente (profissional avaliado pelo cliente,
-- migration 0011), agora no sentido inverso: profissional avalia cliente.
-- Mesma janela de elegibilidade (status = 'confirmado', até 3 dias após o
-- atendimento), mesma nota 1-5 sem comentário obrigatório.
--
-- Decisão de exibição explícita do founder: a nota do cliente só aparece
-- agregada (média + total), nunca comentário individual visível a
-- terceiros, e nunca antes do profissional já ter confirmado aquele
-- pedido — evita recusa seletiva de cliente por julgamento subjetivo
-- antes do primeiro atendimento. Por isso client_reviews NÃO tem policy
-- de select pública/ampla como `reviews` tem (0011) — só o próprio
-- profissional que escreveu enxerga a linha bruta (pra saber "já avaliei
-- esse booking"); a média é exposta só via função SECURITY DEFINER
-- abaixo, que nunca devolve comentário nem linha individual. A UI
-- (agenda/page.tsx) reforça a regra de "só depois de confirmar" não
-- buscando a média nenhuma no bloco de pedidos pendentes — mas a
-- ausência de comentário individual é garantida aqui, no banco, não só
-- na tela.

create table client_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id) on delete cascade,
  nota smallint not null check (nota between 1 and 5),
  comentario text,
  created_at timestamptz not null default now()
);

create index client_reviews_booking_id_idx on client_reviews(booking_id);

alter table client_reviews enable row level security;

-- Só o profissional dono do booking vê a própria linha (não é exposição
-- pública como `reviews` — aqui o objetivo é só permitir a UI saber "já
-- avaliei esse cliente nesse atendimento").
create policy "client_reviews_select_own_professional" on client_reviews
  for select to authenticated
  using (
    exists (
      select 1 from bookings b
      where b.id = booking_id and is_own_professional(b.professional_id)
    )
  );

-- Mesma janela real da 0011 (reviews_insert_own_client), espelhada pro
-- lado profissional: status = 'confirmado', horário já passado, até 3
-- dias depois. Não confiar só na ausência do prompt na UI.
create policy "client_reviews_insert_own_professional" on client_reviews
  for insert to authenticated
  with check (
    exists (
      select 1 from bookings b
      where b.id = booking_id
        and is_own_professional(b.professional_id)
        and b.status = 'confirmado'
        and b.data_hora < now()
        and now() - b.data_hora <= interval '3 days'
    )
  );

-- Única forma de ler a nota de um cliente: agregada, sem comentário, sem
-- linha individual. security definer pra poder ler todas as linhas
-- (inclusive de outros profissionais) sem precisar de policy de select
-- pública em client_reviews.
create or replace function media_avaliacoes_cliente(p_cliente_id uuid)
returns table (media numeric, total bigint) as $$
  select avg(cr.nota)::numeric(3, 2), count(*)
  from client_reviews cr
  join bookings b on b.id = cr.booking_id
  where b.cliente_id = p_cliente_id;
$$ language sql security definer stable set search_path = public;

grant execute on function media_avaliacoes_cliente(uuid) to authenticated;
