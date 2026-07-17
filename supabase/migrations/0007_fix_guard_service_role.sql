-- A guarda de auto-aprovação (0006) bloqueava também a service_role key,
-- porque auth.uid() é nulo fora de uma sessão de usuário real — a checagem
-- "not exists admins where user_id = null" nunca é verdadeira para ninguém
-- nesse contexto. A ferramenta de aprovação real (/admin/aprovacoes) usa a
-- sessão do próprio admin, não a service_role key, então isso não afetava o
-- app — mas bloqueava operação administrativa direta no banco sem motivo.

create or replace function guard_professional_self_update() returns trigger as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if not exists (select 1 from admins where user_id = auth.uid()) then
    if new.status is distinct from old.status then
      raise exception 'Não autorizado a alterar o status do cadastro.';
    end if;
    if new.motivo_recusa is distinct from old.motivo_recusa then
      raise exception 'Não autorizado a alterar o motivo de recusa.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
