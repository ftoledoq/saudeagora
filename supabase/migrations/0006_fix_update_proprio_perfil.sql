-- Corrige bug real pego em teste de ponta a ponta: não existia nenhuma RLS
-- de UPDATE para o profissional alterar a própria linha (só admin tinha
-- update). O upload de foto no cadastro tentava gravar foto_storage_key e
-- falhava em silêncio — RLS bloqueava, PostgREST não reporta erro para
-- UPDATE que casa zero linhas, só "sucesso" sem nenhuma linha afetada.
--
-- A policy sozinha abriria a porta pro profissional mudar o próprio status
-- ou motivo_recusa via chamada direta à API — por isso vem com um trigger
-- de guarda que barra as duas colunas quando quem está alterando não é admin.

create or replace function guard_professional_self_update() returns trigger as $$
begin
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

create trigger professionals_guard_self_update
  before update on professionals
  for each row execute function guard_professional_self_update();

create policy "professionals_update_own" on professionals
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
