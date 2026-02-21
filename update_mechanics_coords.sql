-- Atualiza as coordenadas dos mecânicos baseando-se no Estado (UF)
-- Adiciona uma pequena variação aleatória para que oficinas na mesma região não fiquem sobrepostas exatamente no mesmo ponto.

UPDATE "SITE_Mechanics"
SET 
    latitude = CASE 
        -- Região Sudeste
        WHEN state ILIKE 'SP' OR state ILIKE 'São Paulo' THEN -23.5505 + (random() - 0.5) * 0.5
        WHEN state ILIKE 'RJ' OR state ILIKE 'Rio de Janeiro' THEN -22.9068 + (random() - 0.5) * 0.3
        WHEN state ILIKE 'MG' OR state ILIKE 'Minas Gerais' THEN -19.9167 + (random() - 0.5) * 0.5
        WHEN state ILIKE 'ES' OR state ILIKE 'Espírito Santo' THEN -20.3155 + (random() - 0.5) * 0.2
        
        -- Região Sul
        WHEN state ILIKE 'PR' OR state ILIKE 'Paraná' THEN -25.4284 + (random() - 0.5) * 0.3
        WHEN state ILIKE 'SC' OR state ILIKE 'Santa Catarina' THEN -27.5954 + (random() - 0.5) * 0.3
        WHEN state ILIKE 'RS' OR state ILIKE 'Rio Grande do Sul' THEN -30.0346 + (random() - 0.5) * 0.4
        
        -- Região Centro-Oeste
        WHEN state ILIKE 'DF' OR state ILIKE 'Distrito Federal' THEN -15.7975 + (random() - 0.5) * 0.1
        WHEN state ILIKE 'GO' OR state ILIKE 'Goiás' THEN -16.6869 + (random() - 0.5) * 0.4
        WHEN state ILIKE 'MT' OR state ILIKE 'Mato Grosso' THEN -15.6010 + (random() - 0.5) * 0.5
        WHEN state ILIKE 'MS' OR state ILIKE 'Mato Grosso do Sul' THEN -20.4435 + (random() - 0.5) * 0.4
        
        -- Região Nordeste
        WHEN state ILIKE 'BA' OR state ILIKE 'Bahia' THEN -12.9777 + (random() - 0.5) * 0.5
        WHEN state ILIKE 'PE' OR state ILIKE 'Pernambuco' THEN -8.0476 + (random() - 0.5) * 0.2
        WHEN state ILIKE 'CE' OR state ILIKE 'Ceará' THEN -3.7172 + (random() - 0.5) * 0.2
        
        -- Default (Centro do Brasil) para outros estados
        ELSE -15.7801 + (random() - 0.5) * 2
    END,

    longitude = CASE 
         -- Região Sudeste
        WHEN state ILIKE 'SP' OR state ILIKE 'São Paulo' THEN -46.6333 + (random() - 0.5) * 0.5
        WHEN state ILIKE 'RJ' OR state ILIKE 'Rio de Janeiro' THEN -43.1729 + (random() - 0.5) * 0.3
        WHEN state ILIKE 'MG' OR state ILIKE 'Minas Gerais' THEN -43.9345 + (random() - 0.5) * 0.5
        WHEN state ILIKE 'ES' OR state ILIKE 'Espírito Santo' THEN -40.3128 + (random() - 0.5) * 0.2
        
        -- Região Sul
        WHEN state ILIKE 'PR' OR state ILIKE 'Paraná' THEN -49.2733 + (random() - 0.5) * 0.3
        WHEN state ILIKE 'SC' OR state ILIKE 'Santa Catarina' THEN -48.5480 + (random() - 0.5) * 0.3
        WHEN state ILIKE 'RS' OR state ILIKE 'Rio Grande do Sul' THEN -51.2177 + (random() - 0.5) * 0.4
        
        -- Região Centro-Oeste
        WHEN state ILIKE 'DF' OR state ILIKE 'Distrito Federal' THEN -47.9292 + (random() - 0.5) * 0.1
        WHEN state ILIKE 'GO' OR state ILIKE 'Goiás' THEN -49.2648 + (random() - 0.5) * 0.4
        WHEN state ILIKE 'MT' OR state ILIKE 'Mato Grosso' THEN -56.0979 + (random() - 0.5) * 0.5
        WHEN state ILIKE 'MS' OR state ILIKE 'Mato Grosso do Sul' THEN -54.6030 + (random() - 0.5) * 0.4
        
        -- Região Nordeste
        WHEN state ILIKE 'BA' OR state ILIKE 'Bahia' THEN -38.5016 + (random() - 0.5) * 0.5
        WHEN state ILIKE 'PE' OR state ILIKE 'Pernambuco' THEN -34.8770 + (random() - 0.5) * 0.2
        WHEN state ILIKE 'CE' OR state ILIKE 'Ceará' THEN -38.5434 + (random() - 0.5) * 0.2
        
        -- Default (Centro do Brasil)
        ELSE -47.9292 + (random() - 0.5) * 2
    END
WHERE latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0;
