-- SaúdeAgora — beta enxuto
-- US-03: tabela fixa de referência de bairros (região piloto: RJ + SP),
-- coordenada aproximada do centro do bairro — não geocodificação por
-- endereço exato, conforme CLAUDE.md / Beta_Escopo_Reduzido.md.
--
-- addresses.bairro passa a ser uma FK para essa tabela em vez de texto
-- livre: sem isso, a busca por bairro fica refém de erro de digitação do
-- profissional no cadastro. cidade/estado saem de addresses (já vêm do
-- bairro, não precisam ser duplicados).

create table bairros (
  id uuid primary key default gen_random_uuid(),
  nome varchar(100) not null,
  cidade varchar(100) not null,
  estado varchar(2) not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  unique (nome, cidade)
);

alter table bairros enable row level security;

create policy "bairros_select_all" on bairros
  for select to anon, authenticated
  using (true);

insert into bairros (nome, cidade, estado, latitude, longitude) values
  ('Copacabana', 'Rio de Janeiro', 'RJ', -22.971176, -43.182543),
  ('Ipanema', 'Rio de Janeiro', 'RJ', -22.983833, -43.203621),
  ('Leblon', 'Rio de Janeiro', 'RJ', -22.984779, -43.224739),
  ('Botafogo', 'Rio de Janeiro', 'RJ', -22.951928, -43.182303),
  ('Flamengo', 'Rio de Janeiro', 'RJ', -22.932764, -43.175819),
  ('Barra da Tijuca', 'Rio de Janeiro', 'RJ', -23.004500, -43.365400),
  ('Tijuca', 'Rio de Janeiro', 'RJ', -22.925700, -43.235400),
  ('Recreio dos Bandeirantes', 'Rio de Janeiro', 'RJ', -23.020600, -43.464200),
  ('Jardim Botânico', 'Rio de Janeiro', 'RJ', -22.968300, -43.223100),
  ('Laranjeiras', 'Rio de Janeiro', 'RJ', -22.934500, -43.187800),
  ('Centro', 'Rio de Janeiro', 'RJ', -22.906800, -43.172900),
  ('Vila Mariana', 'São Paulo', 'SP', -23.588300, -46.633800),
  ('Pinheiros', 'São Paulo', 'SP', -23.562900, -46.682200),
  ('Moema', 'São Paulo', 'SP', -23.600300, -46.666000),
  ('Itaim Bibi', 'São Paulo', 'SP', -23.583700, -46.678900),
  ('Vila Madalena', 'São Paulo', 'SP', -23.556000, -46.690600),
  ('Jardins', 'São Paulo', 'SP', -23.567000, -46.665000),
  ('Perdizes', 'São Paulo', 'SP', -23.535000, -46.678000),
  ('Higienópolis', 'São Paulo', 'SP', -23.544500, -46.655500),
  ('Santana', 'São Paulo', 'SP', -23.504000, -46.628000),
  ('Tatuapé', 'São Paulo', 'SP', -23.540000, -46.577000),
  ('Brooklin', 'São Paulo', 'SP', -23.618000, -46.689000),
  ('Sé (Centro)', 'São Paulo', 'SP', -23.550500, -46.633300);

-- ADDRESSES: bairro_id no lugar de bairro/cidade/estado em texto livre -----------------------------------------------------------------

alter table addresses add column bairro_id uuid references bairros(id);
alter table addresses drop column bairro;
alter table addresses drop column cidade;
alter table addresses drop column estado;
alter table addresses alter column bairro_id set not null;

-- Visibilidade pública do endereço de profissionais aprovados (a busca
-- precisa ler o bairro para mostrar distância/mapa). Reaproveita
-- cref_valido() para não reabrir o ciclo de recursão corrigido na 0003.
create policy "addresses_select_public_approved" on addresses
  for select to anon, authenticated
  using (
    id in (
      select endereco_base_id from professionals
      where status = 'aprovado' and cref_valido(id)
    )
  );
