-- SaúdeAgora — beta enxuto
-- Captura de interesse quando alguém acessa de fora da área de cobertura
-- (ver src/components/usar-localizacao-button.tsx, estado
-- "fora_de_cobertura"): tabela simples, só insert — sem policy de select
-- pra anon/authenticated, dado só é lido manualmente (dashboard do
-- Supabase) pra decidir próxima região, não alimenta nenhuma tela do app.

create table interesse_regiao (
  id uuid primary key default gen_random_uuid(),
  cidade text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table interesse_regiao enable row level security;

-- Sem sessão (quem está fora de cobertura pode nem ter conta) e com
-- sessão — mesma tela serve os dois casos, então libera insert pros dois
-- papéis do Supabase.
create policy "interesse_regiao_insert_anon" on interesse_regiao
  for insert to anon, authenticated
  with check (true);

create policy "interesse_regiao_select_admin" on interesse_regiao
  for select to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));
