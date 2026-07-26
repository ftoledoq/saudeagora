-- SaúdeAgora — beta enxuto
-- Profissional pedia pra editar um serviço já cadastrado (preço/duração
-- errados na hora de criar, por exemplo) e não conseguia — 0027 só tinha
-- policy de INSERT/SELECT em services, nenhuma de UPDATE. Nem chegava a dar
-- erro visível de RLS: a UI simplesmente não oferecia a ação (decisão
-- explícita do founder, "fica pra outra rodada" — ver comentário em
-- src/app/perfil/actions.ts), então isso nunca foi exercitado até agora.
--
-- Só UPDATE, não DELETE: excluir um serviço em uso teria que decidir o que
-- fazer com padrões recorrentes (cascade) e horários já gerados a partir
-- dele (ficam com service_id nulo) — fora do escopo pedido agora. Tipo
-- (`tipo`) não é editável por aqui — trocar o tipo de um serviço já
-- oferecido é o mesmo que criar um serviço diferente, não uma correção.
create policy "services_update_own" on services
  for update to authenticated
  using (
    professional_id in (select id from professionals where user_id = auth.uid())
  )
  with check (
    professional_id in (select id from professionals where user_id = auth.uid())
  );
