-- Avaliação de curso pelos alunos (02/11/2026).
--
-- Quiz público em /avaliacao/<slug>, enviado no grupo de WhatsApp da turma ao fim do
-- curso. As perguntas vivem no código (lib/surveys.ts); aqui fica só a resposta.
-- `survey` é o slug do questionário e `answers` guarda { [id da pergunta]: nota | opções | texto }.
--
-- service_role only: o navegador grava e lê via /api/surveys (api/_surveys.ts), que
-- valida as respostas e exige sessão de staff para a leitura. Sem policies de propósito.
create table if not exists public."SITE_SurveyResponses" (
  id uuid primary key default gen_random_uuid(),
  survey text not null,
  -- Sem FK de propósito: uma resposta nunca pode ser recusada porque o curso foi
  -- apagado ou o id em lib/surveys.ts diverge do banco.
  course_id uuid,
  answers jsonb not null,
  name text,
  created_at timestamptz not null default now()
);

create index if not exists "SITE_SurveyResponses_survey_idx"
  on public."SITE_SurveyResponses" (survey, created_at desc);

alter table public."SITE_SurveyResponses" enable row level security;

revoke all on public."SITE_SurveyResponses" from anon, authenticated;
grant all on public."SITE_SurveyResponses" to service_role;

-- A API (PostgREST) só enxerga a tabela nova depois de recarregar o schema.
notify pgrst, 'reload schema';
