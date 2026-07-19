-- SaúdeAgora — beta enxuto
-- Contador de "X atendimentos realizados" no perfil público (item de
-- enriquecimento de perfil) precisa ser visível pra visitante ANÔNIMO —
-- é justamente a prova social que ajuda a converter quem ainda não tem
-- conta. bookings não tem (corretamente) nenhuma policy pública — tem
-- endereço e identidade do cliente. Uma função security definer expõe só
-- a contagem agregada (não vaza nenhuma linha/coluna sensível), mesmo
-- padrão já usado em cref_valido()/professional_publicamente_visivel().

create or replace function atendimentos_realizados_count(p_professional_id uuid) returns integer as $$
  select count(*)::integer from bookings
  where professional_id = p_professional_id
    and (
      status = 'concluido'
      or (status = 'confirmado' and data_hora < now())
    );
$$ language sql security definer stable set search_path = public;
