-- SaúdeAgora — beta enxuto
-- US-05 (agendamento) + fatia da US-07 (só "definir disponibilidade" —
-- ver/confirmar pedidos continua para depois, na ordem original).
--
-- Prevenção de conflito de horário é uma constraint de banco (índice único
-- parcial), não lógica só na aplicação — é o que garante isso sob
-- concorrência real (dois clientes tentando o mesmo horário ao mesmo
-- tempo), conforme o DER completo já previa. Não foi afetado pela ausência
-- de PostGIS nesta fase — não tem nada a ver com geolocalização.

-- CLIENTS -----------------------------------------------------------------

create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nome varchar(150) not null,
  telefone varchar(20) not null,
  email varchar(150) not null unique,
  created_at timestamptz not null default now()
);

alter table clients enable row level security;

create policy "clients_insert_own" on clients
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "clients_select_own" on clients
  for select to authenticated
  using (user_id = auth.uid());

-- AVAILABILITY -----------------------------------------------------------------
-- Declaração do profissional de quando está livre. "bloqueado" é escrito
-- pelo próprio profissional (folga, imprevisto) OU automaticamente pelo
-- trigger abaixo quando um agendamento é criado para aquele horário exato.

create table availability (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(id) on delete cascade,
  data date not null,
  hora_inicio time not null,
  hora_fim time not null,
  status text not null default 'livre' check (status in ('livre', 'bloqueado')),
  created_at timestamptz not null default now(),
  unique (professional_id, data, hora_inicio),
  check (hora_fim > hora_inicio)
);

create index availability_professional_id_idx on availability(professional_id);

alter table availability enable row level security;

create policy "availability_manage_own" on availability
  for all to authenticated
  using (professional_id in (select id from professionals where user_id = auth.uid()))
  with check (professional_id in (select id from professionals where user_id = auth.uid()));

-- Cliente precisa ver os horários livres pra escolher — mesma regra de
-- visibilidade pública já usada em professionals/services/addresses.
create policy "availability_select_public" on availability
  for select to anon, authenticated
  using (
    professional_id in (select id from professionals where status = 'aprovado' and cref_valido(id))
  );

-- BOOKINGS -----------------------------------------------------------------
--
-- Nota de correção: uma primeira versão desta migration usava subquery
-- direta (`cliente_id in (select id from clients where user_id=auth.uid())`)
-- nas policies de bookings, e o inverso em clients (subquery direta em
-- bookings). Isso cria o mesmo ciclo de recursão de RLS já corrigido na
-- 0003 (lá era professionals <-> professional_documents): ler bookings
-- aciona a policy de clients, que aciona a policy de bookings de novo,
-- infinito. Corrigido abaixo usando funções security definer (bypassam RLS
-- da tabela que consultam) para o lado de bookings — quebra o ciclo antes
-- de sair da migration.

create or replace function is_own_client(target_client_id uuid) returns boolean as $$
  select exists (
    select 1 from clients where id = target_client_id and user_id = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

create or replace function is_own_professional(target_professional_id uuid) returns boolean as $$
  select exists (
    select 1 from professionals where id = target_professional_id and user_id = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

create table bookings (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clients(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  service_id uuid not null references services(id),
  address_id uuid not null references addresses(id),
  data_hora timestamptz not null,
  -- 'pendente_pagamento' (DER completo) virou 'solicitado' — sem pagamento
  -- integrado nesta fase. 'cancelado_sistema' fora: não há cancelamento
  -- automático por prazo nesta fase (CLAUDE.md).
  status text not null default 'solicitado' check (
    status in (
      'solicitado', 'confirmado', 'recusado', 'concluido',
      'cancelado_cliente', 'cancelado_profissional',
      'no_show_cliente', 'no_show_profissional'
    )
  ),
  valor numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- O mecanismo real de prevenção de double-booking: um professional_id não
-- pode ter duas linhas ativas no mesmo data_hora. "Ativa" exclui só os
-- status que liberam o horário de volta.
create unique index bookings_no_conflito on bookings (professional_id, data_hora)
  where status not in ('recusado', 'cancelado_cliente', 'cancelado_profissional');

create index bookings_cliente_id_idx on bookings(cliente_id);
create index bookings_professional_id_idx on bookings(professional_id);
create index bookings_status_idx on bookings(status);

create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function set_updated_at();

alter table bookings enable row level security;

create policy "bookings_insert_own_client" on bookings
  for insert to authenticated
  with check (is_own_client(cliente_id));

create policy "bookings_select_own_client" on bookings
  for select to authenticated
  using (is_own_client(cliente_id));

create policy "bookings_select_own_professional" on bookings
  for select to authenticated
  using (is_own_professional(professional_id));

-- Trigger: ao criar um agendamento, bloqueia automaticamente a
-- disponibilidade correspondente — evita o cliente precisar de permissão
-- de escrita em availability (que é do profissional), e mantém uma única
-- fonte de verdade de "esse horário ainda está de pé".
create or replace function block_availability_on_booking() returns trigger as $$
begin
  update availability
  set status = 'bloqueado'
  where professional_id = new.professional_id
    and data = (new.data_hora at time zone 'utc')::date
    and hora_inicio = (new.data_hora at time zone 'utc')::time;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger bookings_block_availability
  after insert on bookings
  for each row execute function block_availability_on_booking();

-- Profissional precisa ver o endereço dos próprios agendamentos (pra saber
-- onde atender) — sem isso, addresses_select_own só libera pro dono
-- (cliente) que criou o endereço avulso do agendamento. Consulta bookings,
-- que agora resolve tudo via função security definer, sem reabrir ciclo.
create policy "addresses_select_via_booking_professional" on addresses
  for select to authenticated
  using (
    id in (
      select address_id from bookings
      where professional_id in (select id from professionals where user_id = auth.uid())
    )
  );

-- Idem para os dados do cliente (nome/telefone) — necessário pra US-07/08
-- (ver pedido, confirmar/recusar), que vem depois, mas a policy já cabe
-- aqui junto do resto do relacionamento bookings.
create policy "clients_select_via_booking_professional" on clients
  for select to authenticated
  using (
    id in (
      select cliente_id from bookings
      where professional_id in (select id from professionals where user_id = auth.uid())
    )
  );
