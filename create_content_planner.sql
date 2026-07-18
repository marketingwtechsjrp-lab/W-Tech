-- ═══════════════════════════════════════════════════════════════════════════
-- Planejador de Conteúdo (Marketing Hub → aba "Planejador")
--
-- Calendário de posts das redes sociais (Instagram, TikTok, Facebook, YouTube,
-- WhatsApp): cada linha é um card de conteúdo com data, quadro/editorial,
-- roteiro, legenda e status de produção. Substitui o calendário do Notion —
-- os dados vivem na nossa VPS.
--
-- Padrão semanal (reunião de marketing de 17/07/2026):
--   dom/ter/qui = produto · seg/qua/sex = dicas/diversos · sáb = reciclagem/corrida
--
-- Rodar no SQL Editor do Supabase (projeto niesvylxwfaffgnmdoql).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Tabela de posts planejados ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SITE_ContentPosts" (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        TEXT NOT NULL,                 -- nome curto do card (ex.: "PEÇA DO DIA")
    post_date    DATE NOT NULL,                 -- dia planejado da postagem
    -- nao_iniciado | gravado | publicado | nao_realizado | excluido
    status       TEXT NOT NULL DEFAULT 'nao_iniciado',
    -- ENDOMARKETING (produto/parceiras) | PAUTA FRIA | PAUTA QUENTE | REAL TIME
    category     TEXT NOT NULL DEFAULT 'PAUTA FRIA',
    -- video | stories | carrossel | estatico
    format       TEXT NOT NULL DEFAULT 'video',
    -- redes onde o conteúdo será publicado
    networks     JSONB NOT NULL DEFAULT '["INSTA","FACE","TIKTOK"]'::jsonb,
    content      TEXT,                          -- CONTEÚDO: descrição mastigada da ideia
    objective    TEXT,                          -- OBJETIVO DO CONTEÚDO
    editorial    TEXT,                          -- quadro/tema (ex.: "Erros comuns, mas fatais — EP.: 002")
    script       TEXT,                          -- roteiro do reels/carrossel
    caption      TEXT,                          -- legenda sugerida
    hashtags     TEXT,
    reference    TEXT,                          -- referência (post antigo, concorrente, marca)
    obs          TEXT,                          -- validações pendentes (Serginho, Alex/Kaká)
    paid_traffic BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_posts_date ON "SITE_ContentPosts"(post_date);

-- ─── RLS (padrão permissivo do projeto — painel usa anon key) ────────────────
ALTER TABLE "SITE_ContentPosts" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_posts_all ON "SITE_ContentPosts";
CREATE POLICY content_posts_all ON "SITE_ContentPosts"
    FOR ALL USING (true) WITH CHECK (true);

-- ─── Seed: semanas de 20/07 a 02/08/2026 (migração do calendário do Notion) ──
INSERT INTO "SITE_ContentPosts" (title, post_date, status, category, format, content, objective, editorial, obs)
SELECT * FROM (VALUES
    ('ITEM 1543',                        DATE '2026-07-20', 'gravado',      'ENDOMARKETING', 'video',
     'Vídeo de aplicação da ferramenta "Kit Adaptador de Máquina de Vácuo"',
     'Reforçar o item do catálogo', 'Ferramenta para: suspensão', NULL),
    ('COMPILADO DE FERRAMENTAS',         DATE '2026-07-21', 'gravado',      'ENDOMARKETING', 'video',
     'Compilado de ferramentas que atendem mais de uma suspensão',
     'Reforçar itens do catálogo', 'Ferramenta para: suspensão', NULL),
    ('ERROS FATAIS',                     DATE '2026-07-22', 'nao_iniciado', 'PAUTA FRIA',    'video',
     'Montar a suspensão com a mola invertida',
     'Educar o público sobre detalhe que pode passar despercebido', 'Erros comuns, mas fatais — EP.: 002', NULL),
    ('ITEM 787',                         DATE '2026-07-23', 'nao_iniciado', 'ENDOMARKETING', 'video',
     'Vídeo do produto "Chave Reservatório de Nitro WP"',
     'Reforçar o item do catálogo', 'Ferramenta para: suspensão traseira', NULL),
    ('PERGUNTA',                         DATE '2026-07-23', 'nao_iniciado', 'PAUTA FRIA',    'stories',
     'Quiz: "Quem é o principal responsável por suportar o peso da moto e do piloto? A- Pressão de nitrogênio / B- Viscosidade do óleo / C- A mola"',
     'Engajamento orgânico nos stories', 'Pensa rápido!', NULL),
    ('RESPOSTA',                         DATE '2026-07-24', 'nao_iniciado', 'PAUTA FRIA',    'stories',
     'Resposta do quiz de ontem (C - A mola), com explicação curta',
     'Fechar o ciclo do quiz e gerar autoridade', 'Pensa rápido!', NULL),
    ('DÚVIDA DOS SEGUIDORES',            DATE '2026-07-24', 'nao_iniciado', 'PAUTA FRIA',    'video',
     'Diferença entre um emulador e uma válvula',
     'Responder dúvida real ouvida na empresa', 'Dúvidas dos seguidores', NULL),
    ('SINAIS DE MANUTENÇÃO (RECICLAGEM)', DATE '2026-07-25', 'nao_iniciado', 'PAUTA FRIA',   'video',
     'Reciclagem do carrossel "Sinais de que sua suspensão precisa de manutenção" em formato vídeo: 1) óleo vazando no retentor; 2) afundando demais no SAG; 3) retorno lento; 4) barulhos ao comprimir; 5) instável na frenagem',
     'Reaproveitar conteúdo validado e preencher o sábado', 'Sinais de manutenção (reciclagem)', NULL),
    ('ERRO DE PRINCIPIANTE',             DATE '2026-07-26', 'nao_iniciado', 'PAUTA FRIA',    'video',
     'Simplificar sobre parte externa e interna da bucha',
     'Educar em nível de curiosidade', 'Erro de principiante', NULL),
    ('DIA DO MOTOCICLISTA',              DATE '2026-07-27', 'nao_iniciado', 'REAL TIME',     'video',
     'Post comemorativo do Dia do Motociclista (27/07)',
     'Presença em data comemorativa do público', 'Datas comemorativas', NULL),
    ('PEÇA DO DIA',                      DATE '2026-07-28', 'nao_iniciado', 'ENDOMARKETING', 'video',
     'Reciclar "Problemas com bucha presa" com gancho novo (começar pelo estrago que causa) OU nova peça validada com o Serginho',
     'Reforçar item do catálogo partindo de uma dor real', 'Peça do dia — Problemas com…', 'Confirmar peça e viabilidade com o Serginho'),
    ('MITOS SOBRE SUSPENSÕES',           DATE '2026-07-29', 'nao_iniciado', 'PAUTA FRIA',    'video',
     'EP.01: escolher 1 mito — "Suspensão dura é suspensão boa" / "Óleo de suspensão nunca precisa de troca" / "Regulagem de fábrica serve pra qualquer piloto"',
     'Educar sem entregar o curso; mito derrubado gera debate', 'Mitos sobre suspensões — EP.: 001', NULL),
    ('LIQUIMOLY',                        DATE '2026-07-30', 'nao_iniciado', 'ENDOMARKETING', 'video',
     'Produto da parceira Liqui Moly em uso real na bancada durante manutenção de suspensão',
     'Presença da marca parceira + dia de produto', 'Parceiros W-Tech', NULL),
    ('PERGUNTA',                         DATE '2026-07-30', 'nao_iniciado', 'PAUTA FRIA',    'stories',
     'Quiz: "O que acontece se o SAG estiver mal regulado? A- Nada / B- Perde estabilidade e desgasta a suspensão / C- Só muda a altura do banco" (resposta B)',
     'Engajamento orgânico nos stories', 'Pensa rápido!', NULL),
    ('RESPOSTA',                         DATE '2026-07-31', 'nao_iniciado', 'PAUTA FRIA',    'stories',
     'Resposta do quiz (B), vídeo curto sem entrar no passo a passo de regulagem (conteúdo do curso)',
     'Fechar o ciclo do quiz', 'Pensa rápido!', NULL),
    ('DICA DO DIA',                      DATE '2026-07-31', 'nao_iniciado', 'PAUTA FRIA',    'video',
     'O jeito certo e seguro de prender a bengala na morsa/bancada: mostrar o jeito errado que danifica a peça → o jeito certo',
     'Dica prática de bancada em nível de curiosidade', 'Dica do dia', NULL),
    ('GIRO DE CORRIDA / REPOST PILOTO',  DATE '2026-08-01', 'nao_iniciado', 'REAL TIME',     'estatico',
     'Checar provas do fim de semana (pilotos patrocinados / Moto Gerais Racing). Com prova → torcida/cobertura; sem prova → repost de parceiro',
     'Preencher o sábado com presença no mundo da corrida', 'Giro de corrida', 'Confirmar provas do fim de semana com Alex/Kaká'),
    ('ITEM (RECICLAGEM)',                DATE '2026-08-02', 'nao_iniciado', 'ENDOMARKETING', 'video',
     'Reciclar um ITEM de bom desempenho com gancho novo (ex.: ITEM 2440 — Chave Alta Velocidade 23 ED, ou "5 ferramentas essenciais")',
     'Domingo de produto sem gravação nova', 'Ferramenta para: suspensão (reciclagem)', 'Conferir contexto novo de aplicação com o Serginho')
) AS seed(title, post_date, status, category, format, content, objective, editorial, obs)
WHERE NOT EXISTS (
    SELECT 1 FROM "SITE_ContentPosts" p
    WHERE p.title = seed.title AND p.post_date = seed.post_date
);
