-- Corrige bug real de fuso horário pego em teste de ponta a ponta: o
-- cliente agora envia data_hora com offset -03:00 explícito (horário de
-- Brasília, a região piloto inteira está nesse fuso). Isso quebra o
-- trigger que bloqueia a disponibilidade correspondente, que assumia
-- (incorretamente) que data_hora já vinha em UTC "cru" batendo direto com
-- o horário local digitado pelo profissional em availability.hora_inicio.
-- Corrigido para converter data_hora para o fuso de Brasília antes de
-- comparar.

create or replace function block_availability_on_booking() returns trigger as $$
begin
  update availability
  set status = 'bloqueado'
  where professional_id = new.professional_id
    and data = (new.data_hora at time zone 'America/Sao_Paulo')::date
    and hora_inicio = (new.data_hora at time zone 'America/Sao_Paulo')::time;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
