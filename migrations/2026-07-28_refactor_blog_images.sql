-- Biblioteca editorial local para todas as capas e imagens internas do blog.
-- Idempotente: pode ser executada novamente sem alterar outros campos.

UPDATE public."SITE_BlogPosts"
SET image = CASE
    WHEN lower(concat_ws(' ', title, slug, category, excerpt)) ~
         '(curso|aula|treinamento|formação|formacao|certificação|certificacao|aprender|escola|instrutor)'
        THEN '/images/blog/suspension-training.webp'
    WHEN lower(concat_ws(' ', title, slug, category, excerpt)) ~
         '(amortecedor|monoshock|shock|mola|preload|pré-carga|pre-carga|sag)'
        THEN '/images/blog/shock-tuning.webp'
    WHEN lower(concat_ws(' ', title, slug, category, excerpt)) ~
         '(manutenção|manutencao|oficina|óleo|oleo|válvula|valvula|retentor|ferramenta|reparo|revisão|revisao|instalação|instalacao|instalar|peça|peca)'
        THEN '/images/blog/fork-service.webp'
    WHEN lower(concat_ws(' ', title, slug, category, excerpt)) ~
         '(rally|rali|viagem|aventura|estrada de terra|cerrado|deserto)'
        THEN '/images/blog/rally-offroad.webp'
    WHEN lower(concat_ws(' ', title, slug, category, excerpt)) ~
         '(enduro|trilha|hard enduro|mata|barro|pedra|off-road|off road)'
        THEN '/images/blog/enduro-trail.webp'
    WHEN lower(concat_ws(' ', title, slug, category, excerpt)) ~
         '(suspensão|suspensao|garfo|fork|dianteira|compressão|compressao|retorno|rebound)'
        THEN '/images/blog/front-fork-closeup.webp'
    ELSE '/images/blog/motocross-action.webp'
END;

-- O acervo importado possui no máximo uma imagem interna por artigo.
-- Remove fontes responsivas legadas e troca o src pela capa temática escolhida.
UPDATE public."SITE_BlogPosts"
SET content = regexp_replace(
    regexp_replace(
        content,
        $rx$[[:space:]]+(srcset|data-src|data-lazy-src)[[:space:]]*=[[:space:]]*(["'])[^"']*\2$rx$,
        '',
        'gi'
    ),
    $rx$(<img[^>]*[[:space:]]src[[:space:]]*=[[:space:]]*)(["'])[^"']*\2$rx$,
    E'\\1' || image || E'\\2',
    'gi'
)
WHERE content ~* '<img[[:space:]>]';

NOTIFY pgrst, 'reload schema';
