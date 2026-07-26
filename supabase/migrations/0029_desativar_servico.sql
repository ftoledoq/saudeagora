-- SaúdeAgora — beta enxuto
-- Profissional pergunta: tenho Personal e Pilates cadastrados, mas não
-- quero mais atender Pilates — como paro? Não existia esse controle por
-- serviço, só por conta inteira (professionals.ativo / clients.ativo, ver
-- migration 0022). Mesmo padrão aqui: pausa reversível, nunca apaga nada.
--
-- Decisão confirmada com o founder: desativar um serviço que já tem
-- agendamento pendente/confirmado futuro é PERMITIDO (não bloqueia) — só
-- avisa na hora, os agendamentos já marcados continuam de pé normalmente,
-- o profissional só para de receber pedido NOVO desse serviço.
alter table services add column ativo boolean not null default true;

-- Só a listagem PÚBLICA (busca, perfil público, tela de agendar do
-- cliente) precisa parar de mostrar o serviço desativado — o próprio
-- profissional continua enxergando os dele (ativos e inativos) em
-- /perfil e /agenda via services_select_own, sem mudança nenhuma aqui,
-- pra poder reativar ou só ver o rótulo de um agendamento antigo.
drop policy if exists "services_select_public_approved" on services;
create policy "services_select_public_approved" on services
  for select to anon, authenticated
  using (
    ativo = true
    and professional_id in (select id from professionals where status = 'aprovado')
  );
