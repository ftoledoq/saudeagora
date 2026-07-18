-- SaúdeAgora — beta enxuto
-- Tela de Perfil/Conta (logout, editar dados) + aceite obrigatório de
-- Termos e Políticas no cadastro de profissional e de cliente, com registro
-- de quando o aceite aconteceu (auditoria mínima de consentimento).
--
-- Sem tabela de log de auditoria dedicada para isso — um timestamp na
-- própria linha é suficiente nesta fase (mesmo raciocínio de simplicidade
-- já aplicado a outras decisões do beta), e não colide com audit_log
-- (que registra mudança de estado do cadastro, não consentimento).

alter table professionals add column termos_aceitos_em timestamptz;
alter table clients add column termos_aceitos_em timestamptz;

-- "Meus dados" (editar nome/telefone) precisa que o cliente consiga
-- atualizar a própria linha — clients nunca teve policy de update (só
-- insert/select até aqui, migration 0008). profissionais já tem
-- professionals_update_own (0006/0007) cobrindo o mesmo caso.
create policy "clients_update_own" on clients
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
