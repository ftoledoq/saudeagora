-- SaúdeAgora — beta enxuto
-- Regressão real, mesma classe da 0026 (que já teve que corrigir isso pras
-- duas funções de visibilidade) — desta vez em services, achada em
-- auditoria ao preparar a limpeza de uma conta de teste: a migration 0029
-- (desativar_servico) reescreveu services_select_public_approved do zero
-- pra somar a checagem de `services.ativo`, mas voltou a usar o estilo
-- antigo de subquery direta (`professional_id in (select id from
-- professionals where status = 'aprovado')`) em vez de
-- professional_publicamente_visivel() — a versão correta desde a 0013.
-- Isso descartou silenciosamente CREF válido, professionals.ativo e
-- is_test_data da visibilidade pública de SERVIÇOS (a policy de
-- professionais_publicos e availability continuavam corretas, só esta
-- regrediu). Corrigido combinando os dois: services.ativo (a checagem
-- nova, real, da 0029) E professional_publicamente_visivel (centralizado,
-- cobre o resto) — nenhum dos dois sozinho é suficiente.
drop policy if exists "services_select_public_approved" on services;
create policy "services_select_public_approved" on services
  for select to anon, authenticated
  using (
    ativo = true
    and professional_publicamente_visivel(professional_id)
  );
