-- SaúdeAgora — beta enxuto
-- guard_professional_self_update (migration 0006) bloqueia qualquer
-- mudança de status por quem não é admin — correto pra impedir
-- auto-aprovação, mas bloquearia também a autoexclusão de conta (US-14).
-- Redefine pra abrir uma única exceção: a própria transição pra
-- 'excluido', só essa — qualquer outra mudança de status por não-admin
-- continua bloqueada exatamente como antes.
create or replace function guard_professional_self_update() returns trigger as $$
begin
  if not exists (select 1 from admins where user_id = auth.uid()) then
    if new.status is distinct from old.status then
      if new.status is distinct from 'excluido' then
        raise exception 'Não autorizado a alterar o status do cadastro.';
      end if;
    end if;
    if new.motivo_recusa is distinct from old.motivo_recusa then
      raise exception 'Não autorizado a alterar o motivo de recusa.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
