-- SaúdeAgora — beta enxuto
-- US-02: capacidade de sistema para aprovação de cadastro (ferramenta
-- interna, não painel público). Sem service_role no caminho do app: o admin
-- age com a própria sessão autenticada, autorizado via tabela `admins` +
-- RLS — a mesma linha de defesa usada em todo o resto do schema.

-- ADMIN -----------------------------------------------------------------

create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table admins enable row level security;

-- Ninguém se autopromove: não existe policy de insert/update/delete para
-- authenticated. A primeira linha entra manualmente via SQL Editor (só o
-- dono do projeto tem acesso a isso). Policy de select só permite checar a
-- própria linha — é o suficiente para os "exists (select 1 from admins...)"
-- usados como checagem de autorização nas policies abaixo.
create policy "admins_select_own" on admins
  for select to authenticated
  using (user_id = auth.uid());

-- MOTIVO DE RECUSA -----------------------------------------------------------------

alter table professionals add column motivo_recusa text;

-- POLICIES DE ADMIN -----------------------------------------------------------------

create policy "professionals_select_admin" on professionals
  for select to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

create policy "professionals_update_status_admin" on professionals
  for update to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

create policy "addresses_select_admin" on addresses
  for select to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

create policy "services_select_admin" on services
  for select to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

create policy "professional_documents_select_admin" on professional_documents
  for select to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

create policy "audit_log_select_admin" on audit_log
  for select to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));

create policy "professional_documents_storage_admin_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'professional-documents'
    and exists (select 1 from admins where user_id = auth.uid())
  );

-- AUDITORIA: registra quem aprovou/recusou e o motivo -----------------------------------------------------------------

create or replace function log_professional_change() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into audit_log (entidade, entidade_id, acao, autor_tipo, autor_id, detalhe)
    values ('professional', new.id, 'cadastro_criado', 'professional', new.user_id,
      jsonb_build_object('status', new.status));
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into audit_log (entidade, entidade_id, acao, autor_tipo, autor_id, detalhe)
    values (
      'professional', new.id, 'status_alterado', 'admin', auth.uid(),
      jsonb_build_object(
        'de', old.status,
        'para', new.status,
        'motivo_recusa', case when new.status = 'recusado' then new.motivo_recusa else null end
      )
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- REVERIFICAÇÃO DE CREF: visibilidade pública some se o CREF venceu -----------------------------------------------------------------

drop policy if exists "professionals_select_public_approved" on professionals;
create policy "professionals_select_public_approved" on professionals
  for select to anon, authenticated
  using (
    status = 'aprovado'
    and not exists (
      select 1 from professional_documents pd
      where pd.professional_id = professionals.id
        and pd.tipo = 'cref'
        and pd.validade < current_date
    )
  );

drop policy if exists "services_select_public_approved" on services;
create policy "services_select_public_approved" on services
  for select to anon, authenticated
  using (
    professional_id in (
      select id from professionals
      where status = 'aprovado'
        and not exists (
          select 1 from professional_documents pd
          where pd.professional_id = professionals.id
            and pd.tipo = 'cref'
            and pd.validade < current_date
        )
    )
  );
