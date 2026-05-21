-- ============================================================
--  CHECKLIST FINAL DE CURSOS — rode no Supabase SQL Editor
-- ============================================================

-- 1. Template de itens (configurável no admin)
create table if not exists "SITE_ChecklistTemplate" (
  id             uuid default gen_random_uuid() primary key,
  name           text not null,
  category       text not null default 'Geral',
  quantity_type  text not null default 'per_student',
  quantity_value numeric not null default 1,
  unit           text not null default 'un',
  notes          text default '',
  sort_order     integer default 0,
  is_active      boolean default true,
  created_at     timestamptz default now()
);

-- 2. Estado salvo por curso
create table if not exists "SITE_CourseChecklists" (
  id           uuid default gen_random_uuid() primary key,
  course_id    uuid references "SITE_Courses"(id) on delete cascade,
  items        jsonb default '[]',
  checked_by_1 text default '',
  checked_by_2 text default '',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique(course_id)
);

-- 3. RLS permissiva (padrão do projeto)
alter table "SITE_ChecklistTemplate" enable row level security;
alter table "SITE_CourseChecklists"  enable row level security;

drop policy if exists "checklist_template_all" on "SITE_ChecklistTemplate";
create policy "checklist_template_all" on "SITE_ChecklistTemplate"
  for all using (true) with check (true);

drop policy if exists "course_checklists_all" on "SITE_CourseChecklists";
create policy "course_checklists_all" on "SITE_CourseChecklists"
  for all using (true) with check (true);

-- 4. Itens padrão (só insere se a tabela estiver vazia)
insert into "SITE_ChecklistTemplate" (name, category, quantity_type, quantity_value, unit, sort_order)
select * from (values
  ('Apostilas',                  'Material do Aluno',       'per_student', 1, 'un',      10),
  ('Camisetas',                  'Material do Aluno',       'per_student', 1, 'un',      20),
  ('Bonés',                      'Material do Aluno',       'per_student', 1, 'un',      30),
  ('Crachás impressos',          'Material do Aluno',       'per_student', 1, 'un',      40),
  ('Certificados impressos',     'Material do Aluno',       'per_student', 1, 'un',      50),
  ('Canetas',                    'Documentos',              'per_student', 1, 'un',      60),
  ('Lista de presença',          'Documentos',              'fixed',       2, 'via',     70),
  ('Cronograma do dia impresso', 'Documentos',              'fixed',       3, 'via',     80),
  ('Coffee break manhã',         'Alimentação',             'per_student', 1, 'porção',  90),
  ('Coffee break tarde',         'Alimentação',             'per_student', 1, 'porção', 100),
  ('Água mineral',               'Alimentação',             'per_student', 2, 'und',    110),
  ('Banner W-Tech principal',    'Marketing & Sinalização', 'fixed',       1, 'un',     120),
  ('Banners laterais',           'Marketing & Sinalização', 'fixed',       2, 'un',     130),
  ('Lona de fundo',              'Marketing & Sinalização', 'fixed',       1, 'un',     140),
  ('Tapete / Carpete',           'Marketing & Sinalização', 'fixed',       1, 'un',     150),
  ('Totem / Display',            'Marketing & Sinalização', 'fixed',       1, 'un',     160),
  ('Material de marketing extra','Marketing & Sinalização', 'fixed',       1, 'kit',    170),
  ('Projetor / Tela',            'Equipamentos',            'fixed',       1, 'un',     180),
  ('Notebook do instrutor',      'Equipamentos',            'fixed',       1, 'un',     190),
  ('Extensão elétrica / régua',  'Equipamentos',            'fixed',       2, 'un',     200),
  ('Adaptadores HDMI/VGA',       'Equipamentos',            'fixed',       1, 'kit',    210),
  ('Kit de ferramentas básico',  'Ferramentas',             'fixed',       1, 'kit',    220),
  ('Multímetro',                 'Ferramentas',             'per_student', 1, 'un',     230),
  ('Material prático do curso',  'Ferramentas',             'per_student', 1, 'kit',    240),
  ('Contato do local / endereço','Logística',               'fixed',       1, 'folha',  250),
  ('Chave / acesso ao espaço',   'Logística',               'fixed',       1, 'un',     260),
  ('Estacionamento / rotas',     'Logística',               'fixed',       1, 'folha',  270)
) as v(name, category, quantity_type, quantity_value, unit, sort_order)
where not exists (select 1 from "SITE_ChecklistTemplate" limit 1);

-- 5. Recarrega o schema cache do PostgREST
notify pgrst, 'reload schema';
