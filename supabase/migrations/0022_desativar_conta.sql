-- SaúdeAgora — beta enxuto
-- Separa duas ações que estavam misturadas numa só ("Cancelar minha
-- conta"): desativação reversível (pausa, sem burocracia) e exclusão
-- permanente (anonimização já implementada, migration 0019). São coisas
-- diferentes — o CDC (art. 72) prevê pena de detenção para quem dificulta
-- acesso/exclusão de dado do consumidor, e já existe autuação real do
-- PROCON contra rede de academia por essa exata prática (dificultar
-- cancelamento). As duas ações continuam de um clique só, sem confirmação
-- múltipla, sem formulário de justificativa, sem prazo de espera.

alter table professionals add column ativo boolean not null default true;
alter table clients add column ativo boolean not null default true;

-- Profissional inativo (pausa autoiniciada) some da busca pelo mesmo
-- mecanismo que já esconde profissional não aprovado — status continua
-- 'aprovado' (não perde a aprovação em si, só a visibilidade), então
-- reativar não precisa refazer nenhuma aprovação.
create or replace function professional_publicamente_visivel(p_professional_id uuid) returns boolean as $$
  select exists (
    select 1 from professionals
    where id = p_professional_id and status = 'aprovado' and ativo and cref_valido(id)
  );
$$ language sql security definer stable set search_path = public;

create or replace function professional_user_id_publicamente_visivel(p_user_id text) returns boolean as $$
  select exists (
    select 1 from professionals
    where user_id::text = p_user_id and status = 'aprovado' and ativo and cref_valido(id)
  );
$$ language sql security definer stable set search_path = public;
