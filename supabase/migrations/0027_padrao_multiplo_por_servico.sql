-- SaúdeAgora — beta enxuto
-- Duas correções estruturais decididas com o founder:
--
-- 1. Duração de horário (padrão ou avulso) estava sempre vindo de "o
--    serviço do profissional" (assumindo um único), ignorando que o
--    modelo (Service) sempre suportou múltiplos serviços por profissional
--    com durações diferentes. Cada horário agora se amarra a um
--    service_id explícito — a duração vem sempre do serviço escolhido,
--    nunca de um valor único fixo.
--
-- 2. Só existia UM padrão recorrente por profissional (salvar um novo
--    substituía o anterior por inteiro, mesmo horário pra todos os dias
--    selecionados) — lacuna real de produto, não dava pra ter "seg/qua/
--    sex de manhã E ter/qui à noite". Introduz grupo_id: cada "padrão"
--    salvo pelo profissional (um conjunto de dias + um horário + um
--    serviço) vira um grupo identificável, editável e removível
--    independente dos outros — não mais uma regra única.

alter table recurring_availability add column service_id uuid references services(id) on delete cascade;
alter table recurring_availability add column grupo_id uuid not null default gen_random_uuid();

-- Backfill: profissionais que já tinham padrão salvo (nesta fase, sempre
-- com exatamente um serviço cadastrado) usam esse serviço.
update recurring_availability ra
set service_id = (
  select s.id from services s where s.professional_id = ra.professional_id limit 1
)
where service_id is null;

-- gen_random_uuid() como default de coluna nova é avaliado LINHA A LINHA
-- pro dado já existente (cada linha ganha um grupo_id diferente) — errado
-- aqui: antes desta migration só existia um padrão por profissional, então
-- as linhas antigas precisam virar um grupo só, não vários. Consolida
-- explicitamente: todas as linhas de um mesmo profissional (que só podem
-- ter existido de uma "salvar padrão" só, na regra antiga) recebem o
-- mesmo grupo_id.
update recurring_availability ra
set grupo_id = sub.grupo_id
from (
  select distinct on (professional_id) professional_id, id as grupo_id
  from recurring_availability
  order by professional_id, id
) sub
where ra.professional_id = sub.professional_id;

alter table recurring_availability alter column service_id set not null;

-- Substitui unique(professional_id, dia_semana) — que impedia mais de um
-- padrão no mesmo dia da semana mesmo em horários diferentes — por
-- unique(professional_id, dia_semana, hora_inicio): mesma dia pode ter
-- mais de um bloco (ex: manhã com um serviço, noite com outro), só não
-- pode ter dois começando exatamente na mesma hora.
do $$
declare
  nome_constraint text;
begin
  select conname into nome_constraint
  from pg_constraint
  where conrelid = 'recurring_availability'::regclass
    and contype = 'u'
    and array_length(conkey, 1) = 2;
  if nome_constraint is not null then
    execute format('alter table recurring_availability drop constraint %I', nome_constraint);
  end if;
end $$;

alter table recurring_availability
  add constraint recurring_availability_prof_dia_hora_key unique (professional_id, dia_semana, hora_inicio);

-- Horário avulso (e os gerados a partir do padrão) também passam a
-- guardar qual serviço atendem — nullable pra não quebrar linhas
-- existentes criadas antes desta migration (elas continuam funcionando,
-- só não têm essa informação retroativamente).
alter table availability add column service_id uuid references services(id) on delete set null;
