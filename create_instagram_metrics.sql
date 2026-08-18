-- ═══════════════════════════════════════════════════════════════════════════
-- Métricas reais do Instagram (@wtechbrasil) — Planejador de Conteúdo
--
-- Tabela SITE_InstagramMetrics: desempenho por post (alcance, likes,
-- comentários, salvamentos, compartilhamentos, views, engajamento, follows).
-- Alimenta o "Radar do Instagram" na aba Planejador e calibra a geração de
-- conteúdo por IA (o que o público da W-Tech realmente engaja).
--
-- Sincronização: rotina semanal (Windsor.ai → REST upsert). O seed abaixo
-- carrega os últimos 90 dias (22/04–16/07/2026), idempotente via ON CONFLICT.
--
-- Rodar no Postgres da VPS (container wtechdb_supadb) e reiniciar o
-- PostgREST (wtechdb_suparest) para recarregar o schema cache.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "SITE_InstagramMetrics" (
    media_id    TEXT PRIMARY KEY,
    posted_at   TIMESTAMPTZ NOT NULL,
    media_type  TEXT NOT NULL,           -- REELS | IMAGE | CAROUSEL_ALBUM | VIDEO
    caption     TEXT,                    -- trecho inicial da legenda (identificação do tema)
    permalink   TEXT,
    reach       INTEGER,
    likes       INTEGER,
    comments    INTEGER,
    saved       INTEGER,
    shares      INTEGER,
    views       INTEGER,
    engagement  INTEGER,                 -- likes + comments + saved + shares
    follows     INTEGER,                 -- seguidores ganhos pelo post (null p/ reels)
    synced_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ig_metrics_posted ON "SITE_InstagramMetrics"(posted_at);

ALTER TABLE "SITE_InstagramMetrics" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ig_metrics_all ON "SITE_InstagramMetrics";
DROP POLICY IF EXISTS ig_metrics_service_only ON "SITE_InstagramMetrics";
REVOKE ALL ON TABLE "SITE_InstagramMetrics" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "SITE_InstagramMetrics" TO service_role;
CREATE POLICY ig_metrics_service_only ON "SITE_InstagramMetrics"
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── Seed: últimos 90 dias (Windsor.ai, coletado em 18/07/2026) ─────────────
INSERT INTO "SITE_InstagramMetrics"
    (media_id, posted_at, media_type, caption, permalink, reach, likes, comments, saved, shares, views, engagement, follows)
VALUES
    ('18432988297136957','2026-04-22T01:14:22Z','REELS','Palestra MANUTENÇÃO INVISÍVEL em Sintra (Art on Wheels)','https://www.instagram.com/reel/DXakN4GiJ3g/',2115,92,3,2,3,4379,105,NULL),
    ('18102774752476696','2026-04-23T19:55:12Z','REELS','Palestra na Art On Wheels - Portugal','https://www.instagram.com/reel/DXfJNX5iE4_/',2888,181,6,2,20,4300,213,NULL),
    ('18433318150140030','2026-04-23T16:45:26Z','REELS','Venha participar está tudo pronto (palestra Portugal)','https://www.instagram.com/reel/DXezbGrCPDT/',2022,151,7,3,16,2930,181,NULL),
    ('18096071075131128','2026-04-25T08:30:31Z','REELS','Começou nosso Primeiro Dia (curso Lisboa)','https://www.instagram.com/reel/DXjEeaMiCAp/',898,38,3,0,3,1211,45,NULL),
    ('18036706040792307','2026-04-27T08:02:17Z','REELS','Curso W-Tech em Lisboa — agradecimento a parceiros','https://www.instagram.com/reel/DXoKvD_CWD1/',2656,76,7,3,36,3606,133,NULL),
    ('18119743084636007','2026-04-30T18:56:01Z','REELS','Depoimentos do curso Lisboa — comenta QUERO','https://www.instagram.com/reel/DXxEGbbJr3Y/',1337,55,6,0,14,1945,80,NULL),
    ('17954850512962303','2026-04-30T14:54:39Z','REELS','Obrigado Portugal — encerramento Europa','https://www.instagram.com/reel/DXwoSm9xVJX/',1634,43,3,0,4,2137,50,NULL),
    ('18109203512492560','2026-05-01T16:42:07Z','REELS','Depoimento Raimundo Iago — do Brasil para Portugal','https://www.instagram.com/reel/DXzZXEhJBG7/',1262,48,3,1,4,1659,60,NULL),
    ('18012532235700012','2026-05-03T18:34:27Z','REELS','(sem legenda)','https://www.instagram.com/reel/DX4uZblowBm/',1845,180,12,1,2,2709,198,NULL),
    ('17972234418038237','2026-05-07T22:01:31Z','CAROUSEL_ALBUM','A teoria é linda, mas é na bancada que a verdade aparece','https://www.instagram.com/p/DYDa94IDqaV/',1765,109,10,2,6,3644,129,1),
    ('18176013172397059','2026-05-13T20:30:56Z','REELS','Tampa Alongada Suspensão Dianteira Honda CRF230','https://www.instagram.com/reel/DYStU8wGuUy/',1550,28,1,0,2,2003,31,NULL),
    ('18048338801772666','2026-05-16T14:46:27Z','REELS','Chave de Pré-Carga Showa Pino','https://www.instagram.com/reel/DYZ0SJEkzGo/',1789,28,2,0,2,2196,32,NULL),
    ('18091253699095705','2026-05-18T11:25:00Z','REELS','LiquiMoly — a excelência está nos detalhes','https://www.instagram.com/reel/DYem63xhTTY/',2187,92,6,7,15,2954,125,NULL),
    ('18054439544732113','2026-05-19T12:30:51Z','REELS','Boné W-Tech Trucker — reposição','https://www.instagram.com/reel/DYhTJgnG4oQ/',1121,49,1,2,1,1685,54,NULL),
    ('18103925207063495','2026-05-20T11:46:00Z','REELS','As 5 ferramentas que vão mudar sua manutenção Showa (compilado)','https://www.instagram.com/reel/DYjyzYgDegA/',4924,260,13,27,31,6851,336,NULL),
    ('18324945472249287','2026-05-23T13:46:51Z','REELS','Fixadores de Bengala — novo design, 3 medidas','https://www.instagram.com/reel/DYrvBmojeHw/',2066,91,13,4,3,2872,111,NULL),
    ('17964103485094466','2026-05-26T11:25:58Z','IMAGE','Fork Oil Liqui Moly — fluido sintético premium','https://www.instagram.com/p/DYzNVi5DxzV/',2088,51,6,0,8,3433,72,2),
    ('17860282188636445','2026-05-26T00:02:24Z','CAROUSEL_ALBUM','Curso Online de Regulagem — SAG, cliques, cockpit','https://www.instagram.com/p/DYx_HAnESEX/',2681,76,27,8,10,6025,125,2),
    ('18084488012258939','2026-05-28T23:10:39Z','IMAGE','Inscrições abertas — Curso Suspensão Piloto','https://www.instagram.com/p/DY5mzRjxs6V/',974,20,0,4,7,1626,32,0),
    ('17991172352991840','2026-05-28T13:55:16Z','REELS','É HOJE — carrinho abre às 20h (curso online)','https://www.instagram.com/reel/DY4n1ZHpmvp/',3187,82,10,7,2,4059,106,NULL),
    ('18117538462770247','2026-05-29T21:20:26Z','REELS','(sem legenda)','https://www.instagram.com/reel/DY7_pKORqKQ/',1646,122,9,1,4,2192,140,NULL),
    ('17864205087629829','2026-05-30T17:42:52Z','REELS','(sem legenda)','https://www.instagram.com/reel/DY-Ln5axnTX/',921,43,2,0,4,1287,49,NULL),
    ('18361111486233736','2026-06-01T20:33:07Z','REELS','Certificados entregues — novos credenciados','https://www.instagram.com/reel/DZDora1jgpA/',1562,52,3,1,7,2100,66,NULL),
    ('18079031093343663','2026-06-01T18:48:51Z','REELS','(sem legenda)','https://www.instagram.com/reel/DZDcu4hxtFa/',1083,91,3,0,3,2113,98,NULL),
    ('18104786387069433','2026-06-02T20:33:47Z','REELS','LiquiMoly: referência mundial em qualidade','https://www.instagram.com/reel/DZGNiASjUkW/',3076,173,8,5,26,4383,223,NULL),
    ('17985292307835022','2026-06-05T12:07:20Z','IMAGE','Parabéns aos novos credenciados (com marcações)','https://www.instagram.com/p/DZNB_r-xiln/',2424,56,6,2,13,3714,79,1),
    ('18415824016183999','2026-06-06T19:39:42Z','REELS','Alex: o conhecimento se faz necessário — EXPERIENCE','https://www.instagram.com/reel/DZQZ8IyxRcG/',1322,55,7,0,3,1799,66,NULL),
    ('18024610178737236','2026-06-06T13:33:45Z','REELS','Braço cansando em 10 minutos de trilha? Acerto da moto','https://www.instagram.com/reel/DZPweRDR2zk/',714,14,2,2,3,817,21,NULL),
    ('18445902052138513','2026-06-09T13:02:05Z','CAROUSEL_ALBUM','Curso EXPERIENCE concluído — 4 dias de imersão','https://www.instagram.com/p/DZXbdydEWLk/',2738,71,13,1,21,5593,116,1),
    ('18115779187873083','2026-06-10T18:15:11Z','REELS','Depoimentos da Imersão Experience','https://www.instagram.com/reel/DZakKWsh9Lb/',1390,37,2,1,9,1894,53,NULL),
    ('17857569408660938','2026-06-10T11:45:09Z','REELS','Vlog do Curso EXPERIENCE — bastidores dos 4 dias','https://www.instagram.com/reel/DZZ3hJkh3jc/',2147,82,6,2,11,2987,114,NULL),
    ('17903570409448065','2026-06-26T12:30:12Z','IMAGE','Chave Externa SHOWA 50mm (foto de produto)','https://www.instagram.com/p/DaDJVJLDTj3/',1107,7,1,0,2,1545,10,0),
    ('18056593355770330','2026-06-28T21:23:47Z','REELS','(sem legenda)','https://www.instagram.com/reel/DaJP9B5xSC1/',1311,70,4,0,3,1703,80,NULL),
    ('18054696014764691','2026-06-28T12:16:46Z','REELS','Suspensão One Way tem solução? Caso Yamaha Ténéré 1200','https://www.instagram.com/reel/DaIRT78AF5U/',2652,230,13,8,21,3650,278,NULL),
    ('18062819531711695','2026-06-29T19:42:05Z','IMAGE','Parabéns aos novos credenciados!','https://www.instagram.com/p/DaLpJA8kfMO/',4267,85,8,2,11,7082,115,7),
    ('18087550409415643','2026-06-30T13:25:48Z','REELS','Certificados entregues — masterclass','https://www.instagram.com/reel/DaNi1KWjO_3/',2030,61,4,0,8,2820,78,NULL),
    ('18139985188554698','2026-07-01T11:16:54Z','REELS','A evolução não depende apenas do piloto','https://www.instagram.com/reel/DaP43OFCKbB/',1095,47,1,1,2,1433,51,NULL),
    ('17895554697507688','2026-07-02T12:20:11Z','IMAGE','Parceria LiquiMoly — elevar o padrão','https://www.instagram.com/p/DaSk883DuKS/',1782,62,1,0,3,3130,69,1),
    ('18139169767560565','2026-07-05T17:14:09Z','IMAGE','Chave Porca Interna (foto de produto)','https://www.instagram.com/p/Daa0-vBGJpE/',786,8,0,0,1,1176,10,0),
    ('18110623124318576','2026-07-06T15:37:00Z','REELS','W-Tech na sua cidade — enquete de destinos','https://www.instagram.com/reel/DadOl7niToq/',1061,24,3,0,0,1480,27,NULL),
    ('18069630911418872','2026-07-12T12:18:53Z','REELS','A ferramenta certa transforma o trabalho — Beta','https://www.instagram.com/reel/DasUsErAEfE/',1959,58,1,3,3,2353,65,NULL),
    ('17978653332052163','2026-07-14T11:15:57Z','REELS','São Paulo chegou a sua vez — curso 25-26/07','https://www.instagram.com/reel/DaxXEyKDdiT/',738,19,1,0,1,999,21,NULL),
    ('18344944411172083','2026-07-15T14:30:04Z','IMAGE','Chave Externa BETA 50mm (foto de produto)','https://www.instagram.com/p/Da0SJpTAdV0/',367,2,0,0,1,640,3,0),
    ('17866247949597032','2026-07-16T12:23:08Z','IMAGE','Emulador W-Tech de volta — promoção até 31/07','https://www.instagram.com/p/Da2oa5QjsBJ/',3412,33,1,3,7,6252,44,2)
ON CONFLICT (media_id) DO UPDATE SET
    reach = EXCLUDED.reach, likes = EXCLUDED.likes, comments = EXCLUDED.comments,
    saved = EXCLUDED.saved, shares = EXCLUDED.shares, views = EXCLUDED.views,
    engagement = EXCLUDED.engagement, follows = EXCLUDED.follows, synced_at = now();
