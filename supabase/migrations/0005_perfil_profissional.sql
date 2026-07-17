-- SaúdeAgora — beta enxuto
-- US-04: perfil público do profissional. Bio e foto não existiam no schema
-- (nem no DER original) — adicionados agora porque o critério de aceite da
-- US-04 exige exibi-los. Foto reaproveita o mesmo bucket privado dos
-- documentos de verificação (não um bucket público novo), com leitura
-- liberada só para o arquivo de foto (por convenção de nome) de
-- profissionais aprovados — identidade/CREF continuam 100% privados.

alter table professionals add column bio text;
alter table professionals add column foto_storage_key text;

-- Documentos (usado para o selo "verificado" com base no status do CREF)
-- ficam legíveis publicamente só para profissionais aprovados — mesma regra
-- de reverificação já usada em professionals/services.
create policy "professional_documents_select_public_approved" on professional_documents
  for select to anon, authenticated
  using (
    professional_id in (
      select id from professionals where status = 'aprovado' and cref_valido(id)
    )
  );

-- Foto de perfil: liberada por convenção de nome (foto-perfil.*), não o
-- bucket inteiro — identidade/CREF (outros nomes de arquivo) continuam
-- inacessíveis para quem não é o dono ou admin.
create policy "professional_photo_storage_public_select" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'professional-documents'
    and name like '%/foto-perfil.%'
    and exists (
      select 1 from professionals p
      where p.user_id::text = (storage.foldername(name))[1]
        and p.status = 'aprovado'
        and cref_valido(p.id)
    )
  );
