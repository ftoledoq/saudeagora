-- SaúdeAgora — beta enxuto
-- Bug real encontrado em teste sistemático: a exceção de disponibilidade
-- recorrente (migration 0023) só era respeitada pela geração automática
-- (recurring.ts) — o formulário de "horário avulso" (adicionarDisponibilidade,
-- agenda/actions.ts) não checava availability_exceptions nenhuma, então dava
-- pra criar manualmente um horário livre e reservável num dia que o próprio
-- profissional tinha acabado de marcar como bloqueado. Confirmado ao vivo,
-- ponta a ponta: o horário aparecia no calendário de agendamento do cliente.
--
-- Corrigido nas duas camadas, não só na aplicação (mesmo padrão já usado em
-- todo o projeto pra regra que também é fronteira de segurança/integridade,
-- não só UX): trigger BEFORE INSERT em availability rejeita qualquer linha
-- cuja (professional_id, data) tenha exceção ativa — fecha a brecha pra
-- SEMPRE, incluindo qualquer caminho futuro que venha a inserir em
-- availability sem passar pelo formulário atual.

create or replace function guard_availability_exception() returns trigger as $$
begin
  if exists (
    select 1 from availability_exceptions ae
    where ae.professional_id = new.professional_id and ae.data = new.data
  ) then
    raise exception 'Esse dia está bloqueado por exceção ao padrão recorrente — desbloqueie antes de adicionar horário.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger availability_guard_exception
  before insert on availability
  for each row execute function guard_availability_exception();
