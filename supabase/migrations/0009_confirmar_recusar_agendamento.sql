-- SaúdeAgora — beta enxuto
-- US-08: profissional confirma ou recusa um pedido de agendamento.
-- Reagendar (mencionado na story original) fica fora desta fatia — muda o
-- fluxo (exige confirmação do cliente pro novo horário) e não tem UI de
-- disponibilidade do lado do cliente ainda; tratar como capacidade futura.

create policy "bookings_update_own_professional" on bookings
  for update to authenticated
  using (is_own_professional(professional_id))
  with check (is_own_professional(professional_id));

-- Restringe a única transição que esta fatia da US-08 implementa:
-- solicitado -> confirmado/recusado. Evita que a policy acima (necessária
-- pro update funcionar) vire uma porta pra qualquer transição de status.
create or replace function guard_booking_status_transition() returns trigger as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if new.status is distinct from old.status then
    if old.status != 'solicitado' or new.status not in ('confirmado', 'recusado') then
      raise exception 'Transição de status não permitida (% -> %).', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger bookings_guard_status_transition
  before update on bookings
  for each row execute function guard_booking_status_transition();
