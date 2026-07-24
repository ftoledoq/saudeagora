-- SaúdeAgora — beta enxuto
-- Regressão real encontrada em auditoria: a migration 0022 (desativar
-- conta) recriou professional_publicamente_visivel e
-- professional_user_id_publicamente_visivel do zero pra adicionar a
-- checagem de `ativo`, mas "create or replace" substitui a função
-- inteira — e a nova versão não incluiu a cláusula
-- `(not is_test_data or viewer_pode_ver_dado_teste())` da migration
-- 0014, removendo silenciosamente o filtro de dado de teste da busca
-- pública. Confirmado: profissionais marcados is_test_data = true
-- (TESTE — Carla Santos, TESTE — Beatriz Lima) ficaram visíveis pra
-- usuário anônimo/real desde então. Restaura as duas condições juntas
-- (ativo E not is_test_data), não uma no lugar da outra.

create or replace function professional_publicamente_visivel(p_professional_id uuid) returns boolean as $$
  select exists (
    select 1 from professionals
    where id = p_professional_id
      and status = 'aprovado'
      and ativo
      and cref_valido(id)
      and (not is_test_data or viewer_pode_ver_dado_teste())
  );
$$ language sql security definer stable set search_path = public;

create or replace function professional_user_id_publicamente_visivel(p_user_id text) returns boolean as $$
  select exists (
    select 1 from professionals
    where user_id::text = p_user_id
      and status = 'aprovado'
      and ativo
      and cref_valido(id)
      and (not is_test_data or viewer_pode_ver_dado_teste())
  );
$$ language sql security definer stable set search_path = public;
