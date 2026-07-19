-- SaúdeAgora — beta enxuto
-- Enriquecimento de perfil dos dois papéis:
-- (a) cliente ganha foto + bio, mesmo padrão já usado pra profissional
--     (US-04): bucket privado dedicado, storage_key, URL assinada,
--     convenção de nome fixo (sem timestamp) pra liberar leitura por
--     padrão de path, não bucket inteiro.
-- (b) contador de atendimentos realizados no perfil público do
--     profissional não precisa de coluna nova — é calculado a partir de
--     bookings (mesma heurística já usada pra elegibilidade de avaliação/
--     card compartilhável: confirmado + horário já passado, ou concluido
--     se algum dia isso passar a ser setado de verdade).

alter table clients add column bio text;
alter table clients add column foto_storage_key text;

-- Bucket dedicado (não o mesmo de professional-documents) — cliente não
-- deveria ter acesso de escrita a um bucket cujas outras policies giram em
-- torno de documento de verificação profissional; mantém a superfície de
-- cada bucket simples e no assunto certo.
insert into storage.buckets (id, name, public)
values ('client-photos', 'client-photos', false)
on conflict (id) do nothing;

create policy "client_photo_storage_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'client-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "client_photo_storage_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Profissional só enxerga a foto do cliente se tiver um booking real com
-- ele — mesmo raciocínio de clients_select_via_booking_professional
-- (migration 0008), agora aplicado ao storage. Sem isso, o card de
-- "Pedidos de agendamento" em /agenda não conseguiria mostrar a foto.
create or replace function client_user_id_visivel_para_profissional(p_user_id text) returns boolean as $$
  select exists (
    select 1 from clients c
    join bookings b on b.cliente_id = c.id
    where c.user_id::text = p_user_id
      and is_own_professional(b.professional_id)
  );
$$ language sql security definer stable set search_path = public;

create policy "client_photo_storage_select_booking_professional" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-photos'
    and client_user_id_visivel_para_profissional((storage.foldername(name))[1])
  );
