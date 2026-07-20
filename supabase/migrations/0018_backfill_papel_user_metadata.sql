-- SaúdeAgora — beta enxuto
-- Corrige a causa estrutural do bug de corrida na tab bar (redirecionamento
-- pra login com sessão ativa, "engolir toque" numa apresentação real): o
-- papel do usuário (profissional/cliente) deixava de ser descoberto via
-- consulta assíncrona no navegador a cada carregamento e passa a viver
-- como claim em user_metadata, gravada uma única vez no momento do
-- cadastro/registrar (signUp) — ver src/lib/role.ts e src/app/layout.tsx,
-- que resolvem isso no servidor antes de qualquer HTML sair.
--
-- Esta migration é só o backfill pra contas que já existiam antes dessa
-- mudança (incluindo as 5 contas de teste persistentes) — daqui pra frente
-- o próprio signUp já grava a claim, não precisa rodar de novo.
--
-- Nota: sessões já ativas (tokens já emitidos) só passam a enxergar essa
-- claim depois de um refresh de token ou novo login — não é instantâneo
-- pra quem já está logado no momento em que isso for aplicado.

update auth.users u
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'profissional')
from professionals p
where p.user_id = u.id;

update auth.users u
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'cliente')
from clients c
where c.user_id = u.id
  and not exists (select 1 from professionals p2 where p2.user_id = u.id);
