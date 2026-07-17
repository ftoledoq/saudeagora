-- Corrige recursão infinita de RLS (erro 42P17) introduzida na 0002:
-- professionals_select_public_approved consultava professional_documents,
-- cuja própria policy (professional_documents_select_own) consulta de volta
-- professionals — ciclo. Solução: mover a checagem de CREF vencido para uma
-- função SECURITY DEFINER, que roda com o privilégio do dono (bypassa RLS
-- de professional_documents), quebrando o ciclo.

create or replace function cref_valido(p_professional_id uuid) returns boolean as $$
  select not exists (
    select 1 from professional_documents pd
    where pd.professional_id = p_professional_id
      and pd.tipo = 'cref'
      and pd.validade < current_date
  );
$$ language sql security definer stable set search_path = public;

drop policy if exists "professionals_select_public_approved" on professionals;
create policy "professionals_select_public_approved" on professionals
  for select to anon, authenticated
  using (status = 'aprovado' and cref_valido(id));

drop policy if exists "services_select_public_approved" on services;
create policy "services_select_public_approved" on services
  for select to anon, authenticated
  using (
    professional_id in (
      select id from professionals
      where status = 'aprovado' and cref_valido(id)
    )
  );
