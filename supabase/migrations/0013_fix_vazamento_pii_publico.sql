-- SaúdeAgora — beta enxuto
-- Corrige vazamento de PII encontrado em auditoria sistemática de RLS
-- (2026-07-18): professionals_select_public_approved, addresses_select_-
-- public_approved e professional_documents_select_public_approved liberavam
-- a LINHA INTEIRA (todas as colunas) para anon/authenticated em profissio-
-- nais aprovados. RLS é por linha, não por coluna — a UI só pedia nome/
-- bio/foto/bairro, mas uma chamada de API direta pedindo cpf/telefone/
-- email (professionals), rua/referencia (addresses) ou storage_key de
-- identidade/CREF (professional_documents) recebia esses dados de
-- qualquer profissional aprovado, sem autenticação. Confirmado ao vivo
-- com sessão anon real antes de escrever esta migration.
--
-- Correção: uma view pública expõe só as colunas seguras (reaproveitada
-- por /buscar e /profissionais/[id]), e uma função security definer cobre
-- o único uso legítimo de e-mail do profissional fora de admin/self (aviso
-- de novo pedido, em /profissionais/[id]/agendar/actions.ts).
--
-- Efeito cascata mapeado antes de aplicar: services_select_public_approved,
-- availability_select_public e a policy de storage da foto pública faziam
-- subquery DIRETA em professionals (`... where status = 'aprovado'`) — ao
-- remover a policy pública de professionals, essas três policies passariam
-- a enxergar zero linhas (RLS bloqueia a subquery antes do WHERE), quebrando
-- busca, disponibilidade e foto pública silenciosamente. Reescritas para
-- usar uma função security definer, que bypassa RLS da tabela consultada —
-- mesmo padrão já usado em cref_valido()/is_own_client()/is_own_professional().

-- FUNÇÃO CENTRAL DE VISIBILIDADE PÚBLICA -----------------------------------------------------------------

create or replace function professional_publicamente_visivel(p_professional_id uuid) returns boolean as $$
  select exists (
    select 1 from professionals
    where id = p_professional_id and status = 'aprovado' and cref_valido(id)
  );
$$ language sql security definer stable set search_path = public;

-- Variante para a policy de storage, que só tem o user_id (pasta), não o
-- professional_id — precisa do próprio lookup dentro da função (bypassando
-- RLS), não só da checagem de status.
create or replace function professional_user_id_publicamente_visivel(p_user_id text) returns boolean as $$
  select exists (
    select 1 from professionals
    where user_id::text = p_user_id and status = 'aprovado' and cref_valido(id)
  );
$$ language sql security definer stable set search_path = public;

-- VIEW PÚBLICA (substitui SELECT direto em professionals/addresses) -----------------------------------------------------------------
-- security_invoker = false (padrão): roda com o privilégio de quem criou a
-- view, não de quem consulta — é o que permite anon ler isto sem ter
-- nenhuma policy própria liberando linhas de professionals/addresses.

create view professionais_publicos with (security_invoker = false) as
select
  p.id,
  p.nome,
  p.bio,
  p.foto_storage_key,
  b.id as bairro_id,
  b.nome as bairro_nome,
  b.cidade as bairro_cidade,
  b.estado as bairro_estado,
  b.latitude as bairro_latitude,
  b.longitude as bairro_longitude
from professionals p
join addresses a on a.id = p.endereco_base_id
join bairros b on b.id = a.bairro_id
where professional_publicamente_visivel(p.id);

grant select on professionais_publicos to anon, authenticated;

-- FUNÇÃO PARA O ÚNICO USO LEGÍTIMO DE E-MAIL FORA DE SELF/ADMIN -----------------------------------------------------------------
-- Notificação de novo pedido (agendar/actions.ts) precisa do e-mail do
-- profissional, lido pelo CLIENTE que acabou de criar o booking — não é
-- nem self nem admin. Só retorna o e-mail se existir de fato um booking
-- entre o cliente autenticado e esse profissional (não é uma porta aberta
-- para colher e-mail de qualquer profissional_id).

create or replace function professional_email_for_own_booking(p_professional_id uuid) returns text as $$
  select p.email from professionals p
  where p.id = p_professional_id
    and exists (
      select 1 from bookings b
      where b.professional_id = p.id and is_own_client(b.cliente_id)
    );
$$ language sql security definer stable set search_path = public;

-- REMOÇÃO DAS POLICIES QUE LIBERAVAM A LINHA INTEIRA -----------------------------------------------------------------

drop policy if exists "professionals_select_public_approved" on professionals;
drop policy if exists "addresses_select_public_approved" on addresses;
drop policy if exists "professional_documents_select_public_approved" on professional_documents;

-- REESCRITA DAS POLICIES QUE DEPENDIAM DA VISIBILIDADE PÚBLICA DE PROFESSIONALS -----------------------------------------------------------------

drop policy if exists "services_select_public_approved" on services;
create policy "services_select_public_approved" on services
  for select to anon, authenticated
  using (professional_publicamente_visivel(professional_id));

drop policy if exists "availability_select_public" on availability;
create policy "availability_select_public" on availability
  for select to anon, authenticated
  using (professional_publicamente_visivel(professional_id));

drop policy if exists "professional_photo_storage_public_select" on storage.objects;
create policy "professional_photo_storage_public_select" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'professional-documents'
    and name like '%/foto-perfil.%'
    and professional_user_id_publicamente_visivel((storage.foldername(name))[1])
  );
