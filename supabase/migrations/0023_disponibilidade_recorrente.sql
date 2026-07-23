-- SaúdeAgora — beta enxuto
-- Traz a "disponibilidade recorrente" (Tela 11 do wireframe) para o
-- código real. Abordagem escolhida (Opção A, discutida com o founder):
-- o padrão recorrente e as exceções são regras separadas, mas a fonte de
-- verdade de "o que existe" continua sendo a tabela `availability` já
-- existente — o padrão só GERA linhas avulsas nela (renovadas por código,
-- não por cron: toda vez que o profissional visita /agenda ou faz login),
-- reaproveitando 100% da busca, remoção e prevenção de double-booking já
-- construídas e testadas. O trade-off: só existe UM padrão ativo por
-- profissional; salvar um novo padrão substitui o anterior por inteiro —
-- não há edição granular por dia nesta fase (ver relato ao founder).

create table recurring_availability (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(id) on delete cascade,
  -- Mesma convenção de src/lib/format.ts (diaSemanaAbrev/getUTCDay):
  -- 0 = domingo ... 6 = sábado.
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fim time not null,
  created_at timestamptz not null default now(),
  unique (professional_id, dia_semana),
  check (hora_fim > hora_inicio)
);

create index recurring_availability_professional_id_idx on recurring_availability(professional_id);

alter table recurring_availability enable row level security;

create policy "recurring_availability_manage_own" on recurring_availability
  for all to authenticated
  using (professional_id in (select id from professionals where user_id = auth.uid()))
  with check (professional_id in (select id from professionals where user_id = auth.uid()));

-- Bloqueio de exceção: "toda segunda, exceto dia 28/07". Guarda só a data —
-- a geração automática (recurring.ts) consulta esta tabela e pula qualquer
-- data presente aqui, e adicionar uma exceção também apaga na hora
-- qualquer horário 'livre' já gerado pra aquela data (nunca toca em
-- horário 'bloqueado' por um agendamento real — ver bookings_block_availability
-- na migration 0008).
create table availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(id) on delete cascade,
  data date not null,
  created_at timestamptz not null default now(),
  unique (professional_id, data)
);

create index availability_exceptions_professional_id_idx on availability_exceptions(professional_id);

alter table availability_exceptions enable row level security;

create policy "availability_exceptions_manage_own" on availability_exceptions
  for all to authenticated
  using (professional_id in (select id from professionals where user_id = auth.uid()))
  with check (professional_id in (select id from professionals where user_id = auth.uid()));
