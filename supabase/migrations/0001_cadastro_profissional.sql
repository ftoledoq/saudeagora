-- SaúdeAgora — beta enxuto
-- Schema reduzido do DER formal (docs/SaudeAgora/01_tecnico/SaudeAgora_DER_Formal.md)
-- para US-01 (cadastro de profissional) + US-02 (capacidade de aprovação).
-- Fora desta migration, por escopo: Payment, Payout, PayoutBooking, Message,
-- geolocalização precisa (endereço fica em texto simples, sem coluna geography).

create extension if not exists pgcrypto;

-- ENUMS -----------------------------------------------------------------

create type professional_status as enum ('pendente', 'aprovado', 'recusado', 'bloqueado', 'suspenso');
create type document_tipo as enum ('identidade', 'cref', 'outro');
create type document_status as enum ('pendente', 'aprovado', 'recusado');
create type service_tipo as enum ('personal_trainer', 'massagem', 'pilates');
create type audit_autor_tipo as enum ('user', 'professional', 'admin', 'sistema');

-- TABELAS -----------------------------------------------------------------

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  rua varchar(200) not null,
  bairro varchar(100) not null,
  cidade varchar(100) not null,
  estado varchar(2) not null,
  referencia varchar(200),
  created_at timestamptz not null default now()
);

create index addresses_user_id_idx on addresses(user_id);

create table professionals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nome varchar(150) not null,
  cpf varchar(11) not null unique, -- somente dígitos, normalizado pela aplicação
  telefone varchar(20) not null,
  email varchar(150) not null unique,
  endereco_base_id uuid not null references addresses(id),
  status professional_status not null default 'pendente',
  raio_atendimento_km integer not null check (raio_atendimento_km > 0),
  preco_base numeric(10,2) not null check (preco_base > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index professionals_status_idx on professionals(status);

create table professional_documents (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(id) on delete cascade,
  tipo document_tipo not null,
  storage_key text not null,
  status document_status not null default 'pendente',
  validade date, -- usado na reverificação de CREF (US-02)
  created_at timestamptz not null default now()
);

create index professional_documents_professional_id_idx on professional_documents(professional_id);

create table services (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(id) on delete cascade,
  tipo service_tipo not null,
  preco numeric(10,2) not null check (preco > 0),
  duracao_min integer not null check (duracao_min > 0),
  descricao text,
  created_at timestamptz not null default now()
);

create index services_professional_id_idx on services(professional_id);

-- Append-only por design: nenhuma policy de INSERT/UPDATE para authenticated/anon.
-- Só é populada pela trigger SECURITY DEFINER abaixo ou por service_role (admin).
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  entidade varchar(50) not null,
  entidade_id uuid not null,
  acao varchar(50) not null,
  autor_tipo audit_autor_tipo not null,
  autor_id uuid,
  detalhe jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entidade_idx on audit_log(entidade, entidade_id);
create index audit_log_created_at_idx on audit_log(created_at);

-- TRIGGERS -----------------------------------------------------------------

create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger professionals_set_updated_at
  before update on professionals
  for each row execute function set_updated_at();

-- Roda com o privilégio do dono da função (não do usuário autenticado), para
-- o log de auditoria não poder ser forjado nem pulado pelo cliente.
create function log_professional_change() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into audit_log (entidade, entidade_id, acao, autor_tipo, autor_id, detalhe)
    values ('professional', new.id, 'cadastro_criado', 'professional', new.user_id,
      jsonb_build_object('status', new.status));
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into audit_log (entidade, entidade_id, acao, autor_tipo, autor_id, detalhe)
    values ('professional', new.id, 'status_alterado', 'sistema', null,
      jsonb_build_object('de', old.status, 'para', new.status));
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger professionals_log_change
  after insert or update on professionals
  for each row execute function log_professional_change();

-- ROW LEVEL SECURITY -----------------------------------------------------------------

alter table addresses enable row level security;
alter table professionals enable row level security;
alter table professional_documents enable row level security;
alter table services enable row level security;
alter table audit_log enable row level security;

create policy "addresses_insert_own" on addresses
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "addresses_select_own" on addresses
  for select to authenticated
  using (user_id = auth.uid());

create policy "professionals_insert_own" on professionals
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "professionals_select_own" on professionals
  for select to authenticated
  using (user_id = auth.uid());

-- Antecipa a US-03 (busca): só profissionais aprovados ficam visíveis
-- publicamente. Não expõe nenhuma tela nova agora, só a regra no banco.
create policy "professionals_select_public_approved" on professionals
  for select to anon, authenticated
  using (status = 'aprovado');

create policy "professional_documents_insert_own" on professional_documents
  for insert to authenticated
  with check (
    professional_id in (select id from professionals where user_id = auth.uid())
  );

create policy "professional_documents_select_own" on professional_documents
  for select to authenticated
  using (
    professional_id in (select id from professionals where user_id = auth.uid())
  );

create policy "services_insert_own" on services
  for insert to authenticated
  with check (
    professional_id in (select id from professionals where user_id = auth.uid())
  );

create policy "services_select_own" on services
  for select to authenticated
  using (
    professional_id in (select id from professionals where user_id = auth.uid())
  );

create policy "services_select_public_approved" on services
  for select to anon, authenticated
  using (
    professional_id in (select id from professionals where status = 'aprovado')
  );

-- STORAGE -----------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('professional-documents', 'professional-documents', false)
on conflict (id) do nothing;

-- Cada profissional só enxerga/envia arquivos dentro da própria pasta
-- ({user_id}/...) dentro do bucket.
create policy "professional_documents_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'professional-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "professional_documents_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'professional-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
