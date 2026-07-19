-- SaúdeAgora — beta enxuto
-- Suporte a perfis de teste persistentes (2-3 profissionais + 2 clientes)
-- que o founder mantém no banco para testar fluxo completo sozinho, sem
-- depender de dado criado e apagado a cada tarefa.
--
-- Regra: dado marcado como teste (is_test_data = true) não pode aparecer
-- pra usuário real nem anônimo — só pra quem já é, ele mesmo, uma conta de
-- teste (ou admin). Fechado no nível da função que já centraliza
-- visibilidade pública (professional_publicamente_visivel, migration
-- 0013), então cobre a view pública, services e availability de uma vez —
-- não é filtro repetido em cada lugar.

alter table professionals add column is_test_data boolean not null default false;
alter table clients add column is_test_data boolean not null default false;

create or replace function viewer_pode_ver_dado_teste() returns boolean as $$
  select
    exists (select 1 from admins where user_id = auth.uid())
    or exists (select 1 from professionals where user_id = auth.uid() and is_test_data = true)
    or exists (select 1 from clients where user_id = auth.uid() and is_test_data = true);
$$ language sql security definer stable set search_path = public;

-- Substitui a versão da 0013: mesmo comportamento de aprovado+CREF válido,
-- agora também exigindo que dado de teste só seja visível pra quem já é
-- teste/admin. Como services_select_public_approved, availability_select_-
-- public e a view professionais_publicos (0013) já usam esta função, a
-- regra se propaga pra todos de graça, sem reescrever cada policy.
create or replace function professional_publicamente_visivel(p_professional_id uuid) returns boolean as $$
  select exists (
    select 1 from professionals
    where id = p_professional_id
      and status = 'aprovado'
      and cref_valido(id)
      and (not is_test_data or viewer_pode_ver_dado_teste())
  );
$$ language sql security definer stable set search_path = public;

-- Mesma regra pro lookup usado pela policy de storage da foto pública.
create or replace function professional_user_id_publicamente_visivel(p_user_id text) returns boolean as $$
  select exists (
    select 1 from professionals
    where user_id::text = p_user_id
      and status = 'aprovado'
      and cref_valido(id)
      and (not is_test_data or viewer_pode_ver_dado_teste())
  );
$$ language sql security definer stable set search_path = public;
