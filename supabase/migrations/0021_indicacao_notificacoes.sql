-- SaúdeAgora — beta enxuto
-- Indique amigos (só mecanismo de rastreamento por enquanto, sem
-- recompensa monetária) + preferência de notificação por e-mail.

alter table clients add column indicado_por text;
alter table professionals add column indicado_por text;

alter table clients add column notificacoes_email boolean not null default true;
alter table professionals add column notificacoes_email boolean not null default true;

-- RLS de clients/professionals só libera a própria linha (clients_select_own/
-- professionals_update_own) — contar quem ALGUÉM indicou exige ler linhas de
-- OUTRAS pessoas. security definer bypassa isso com segurança porque usa
-- auth.uid() internamente, nunca um id vindo do cliente — não dá pra
-- espionar a contagem de indicação de outra pessoa com isso.
-- professional_email_for_own_booking (migration 0013) agora respeita a
-- preferência de notificação — retorna null (não dispara e-mail) se o
-- profissional desativou notificacoes_email, sem duplicar a checagem de
-- booking em outra função.
create or replace function professional_email_for_own_booking(p_professional_id uuid) returns text as $$
  select p.email from professionals p
  where p.id = p_professional_id
    and p.notificacoes_email
    and exists (
      select 1 from bookings b
      where b.professional_id = p.id and is_own_client(b.cliente_id)
    );
$$ language sql security definer stable set search_path = public;

create or replace function contar_indicacoes() returns integer as $$
  select (
    (select count(*) from clients where indicado_por = auth.uid()::text) +
    (select count(*) from professionals where indicado_por = auth.uid()::text)
  )::integer;
$$ language sql security definer stable set search_path = public;
