/**
 * Planejador de Conteúdo — geração de sugestões com IA.
 *
 * Usa o motor de IA da plataforma (lib/ai.ts — provider e chaves gerenciados
 * em Configurações) para preencher os dias vagos da semana seguinte com cards
 * completos no padrão editorial da equipe. A IA só SUGERE: nada é salvo sem a
 * aprovação da equipe no preview (ContentPlannerView).
 *
 * Regras editoriais da reunião de marketing de 17/07/2026:
 *   dom/ter/qui = produto · seg/qua/sex = dicas/diversos · sáb = reciclagem/corrida
 *   quadros semanais rotativos (máx. 1x por semana cada) · stories todo dia.
 */
import { generateContent } from './ai';
import {
    ContentPost, ContentPostInput, ContentPostCategory, ContentPostFormat,
    PostAIDetail, fetchContentPosts, EDITORIAL_QUADROS,
} from './contentPlanner';

// ─── Helpers de data ─────────────────────────────────────────────────────────

const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
};

const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Tipo de pauta esperado para cada dia da semana (0 = domingo … 6 = sábado). */
const DAY_TYPE: string[] = [
    'PRODUTO (item do catálogo, parceira ou "Peça do dia")',
    'DICA/DIVERSO (quadro semanal, curiosidade, análise)',
    'PRODUTO (item do catálogo, parceira ou "Peça do dia")',
    'DICA/DIVERSO (quadro semanal, curiosidade, análise)',
    'PRODUTO (item do catálogo, parceira ou "Peça do dia")',
    'DICA/DIVERSO (quadro semanal, curiosidade, análise)',
    'RECICLAGEM de conteúdo validado OU "Giro de corrida / Repost piloto" (real time)',
];

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface WeekSuggestionResult {
    /** Cards sugeridos pela IA, prontos para revisão e aprovação. */
    suggestions: ContentPostInput[];
    /** Dias que estavam vagos e foram alvo da geração (ISO). */
    targetDays: string[];
}

interface RawSuggestion {
    title?: string;
    post_date?: string;
    category?: string;
    format?: string;
    networks?: string[];
    content?: string;
    objective?: string;
    editorial?: string;
    script?: string;
    caption?: string;
    hashtags?: string;
    obs?: string;
}

const VALID_CATEGORIES: ContentPostCategory[] = ['ENDOMARKETING', 'PAUTA FRIA', 'PAUTA QUENTE', 'REAL TIME'];
const VALID_FORMATS: ContentPostFormat[] = ['video', 'stories', 'carrossel', 'estatico'];

// ─── Prompt ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é o planejador de conteúdo da W-Tech Brasil (referência nacional em suspensões de moto: ferramentas especializadas, cursos presenciais e manutenção). Você preenche o calendário de posts das redes sociais (Instagram, TikTok, Facebook) com sugestões completas, prontas para a social media refinar e gravar.

DIRETRIZES INEGOCIÁVEIS:
- O perfil NÃO pode virar catálogo: o seguidor quer a EXPERIÊNCIA da W-Tech, não uma vitrine. Equilíbrio entre produto e conteúdo.
- Dicas em nível de curiosidade são ótimas (geram autoridade e alimentam o funil do curso), mas NUNCA entregue o passo a passo técnico completo que é conteúdo do curso presencial.
- Reciclagem de conteúdo é bem-vinda: mesmo tópico com gancho/formato diferente.
- Quadros semanais (cada um NO MÁXIMO 1x por semana, rotacionando entre semanas): ${EDITORIAL_QUADROS.slice(0, 6).join(' · ')}. Em "Erros comuns, mas fatais", numere os episódios (EP.: 00X) continuando do último usado.
- Quinta = card extra "PERGUNTA" (format stories, quadro "Pensa rápido!", quiz A/B/C sobre suspensão) e sexta = card extra "RESPOSTA" (format stories, explicação curta) — além do post do feed.
- Parceiras para dias de produto: LiquiMoly, SKF, KYB — priorize a que apareceu menos nas últimas semanas.
- Referências de universo: motocross/trilha/off-road, pilotos patrocinados (Moto Gerais Racing), marcas (KYB, Showa, Husqvarna, Honda, Suzuki, BMW).
- Datas comemorativas do mundo da moto têm prioridade sobre o padrão do dia.
- Priorize temáticas com maior potencial de engajamento (conteúdo que gera salvamento, comentário e compartilhamento: erros, mitos, comparações, "antes/depois", problemas comuns) e de conversão (que alimenta o funil do curso presencial ou destaca ferramenta do catálogo resolvendo dor real).
- Tudo em português do Brasil, tom direto e prático de oficina.

FORMATO DA RESPOSTA: responda APENAS com um array JSON válido (sem markdown, sem comentários), onde cada item tem exatamente estes campos:
{"title": "NOME CURTO EM CAIXA ALTA", "post_date": "AAAA-MM-DD", "category": "ENDOMARKETING|PAUTA FRIA|PAUTA QUENTE|REAL TIME", "format": "video|stories|carrossel|estatico", "networks": ["INSTA","FACE","TIKTOK"], "content": "a ideia, mastigada, com 2-3 opções quando fizer sentido", "objective": "por que esse post", "editorial": "nome do quadro/tema", "script": "gancho → desenvolvimento → CTA (carrossel: 1 slide por linha)", "caption": "legenda pronta", "hashtags": "#suspensão #wtech #motocross #manutençãodemoto", "obs": "o que precisa de validação humana (peça → Serginho; corrida → Alex/Kaká) ou vazio"}
Categorias: produto/parceira = ENDOMARKETING · dica/quadro = PAUTA FRIA · corrida/atualidade = REAL TIME.`;

const buildUserPrompt = (
    recentPosts: ContentPost[],
    emptyDays: { date: string; weekday: string; type: string }[],
    needsQuizPair: boolean,
) => {
    const historico = recentPosts.map(p =>
        `${p.post_date} (${WEEKDAY_NAMES[new Date(p.post_date + 'T12:00:00').getDay()]}): ${p.title}` +
        `${p.editorial ? ` [${p.editorial}]` : ''} — ${p.category}, ${p.format}, status ${p.status}`
    ).join('\n');

    const alvos = emptyDays.map(d => `- ${d.date} (${d.weekday}): ${d.type}`).join('\n');

    return `CALENDÁRIO RECENTE E FUTURO (para você respeitar a rotação de quadros, continuar numeração de episódios, evitar repetir tema e balancear parceiras):
${historico || '(vazio)'}

DIAS VAGOS QUE VOCÊ DEVE PREENCHER (1 card por dia, exatamente nestas datas):
${alvos}
${needsQuizPair ? '\nA quinta e a sexta desta lista devem ganhar TAMBÉM o par de stories: card "PERGUNTA" na quinta e card "RESPOSTA" na sexta (além do card do feed de cada dia).' : ''}

Gere o array JSON com os cards.`;
};

// ─── Parse e validação ───────────────────────────────────────────────────────

/** Extrai o array JSON da resposta da IA (tolera cercas de markdown). */
const parseAIResponse = (raw: string): RawSuggestion[] => {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('A IA não retornou um JSON válido. Tente gerar novamente.');
    }
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(parsed)) throw new Error('Resposta da IA em formato inesperado.');
    return parsed as RawSuggestion[];
};

/** Sanitiza uma sugestão bruta da IA para um ContentPostInput seguro. */
const sanitize = (raw: RawSuggestion, allowedDays: Set<string>): ContentPostInput | null => {
    if (!raw.title || !raw.post_date || !allowedDays.has(raw.post_date)) return null;
    return {
        title: String(raw.title).toUpperCase().slice(0, 80),
        post_date: raw.post_date,
        status: 'nao_iniciado',
        category: VALID_CATEGORIES.includes(raw.category as ContentPostCategory)
            ? (raw.category as ContentPostCategory) : 'PAUTA FRIA',
        format: VALID_FORMATS.includes(raw.format as ContentPostFormat)
            ? (raw.format as ContentPostFormat) : 'video',
        networks: Array.isArray(raw.networks) && raw.networks.length
            ? (raw.networks.filter(n => ['INSTA', 'FACE', 'TIKTOK', 'YB', 'WHATS'].includes(n)) as ContentPostInput['networks'])
            : ['INSTA', 'FACE', 'TIKTOK'],
        content: raw.content || '',
        objective: raw.objective || '',
        editorial: raw.editorial || '',
        script: raw.script || '',
        caption: raw.caption || '',
        hashtags: raw.hashtags || '',
        reference: '',
        obs: raw.obs || '',
        paid_traffic: false,
        ai_detail: null,
    };
};

// ─── Detalhamento de post (tela dedicada) ────────────────────────────────────

const DETAIL_SYSTEM_PROMPT = `Você é o diretor de conteúdo da W-Tech Brasil (referência nacional em suspensões de moto: ferramentas especializadas, cursos presenciais e manutenção). Sua função: transformar uma PAUTA de post em um POST DETALHADO, pronto para a social media produzir no mesmo dia, com celular, na bancada da oficina.

CONTEXTO DE PRODUÇÃO (respeite sempre):
- Equipe enxuta: 1 social media (Noemi) gravando com celular na oficina; peças e ferramentas reais disponíveis na bancada (validar com o Serginho); Alex é a autoridade técnica que pode aparecer explicando.
- Público: mecânicos de moto, donos de oficina, pilotos de trilha/motocross e entusiastas — linguagem de oficina, direta, sem enrolação.
- REGRA DE OURO: dicas em nível de curiosidade geram autoridade e alimentam o funil do curso presencial, mas NUNCA entregue o passo a passo técnico completo que é conteúdo do curso.
- O perfil não é catálogo: mesmo post de produto precisa partir de uma dor real e mostrar a experiência da W-Tech.

FRAMEWORK DE ENGAJAMENTO (use para construir e para pontuar):
- Gancho dos 3 segundos: abrir com dor, erro, pergunta polêmica ou resultado ("isso aqui destrói sua suspensão…", "9 em cada 10 mecânicos erram isso…").
- Gatilhos: SALVAMENTO (checklist, referência técnica), COMENTÁRIO (pergunta, opinião dividida, "qual você usa?"), COMPARTILHAMENTO ("marca aquele amigo que…"), RETENÇÃO (loop, promessa cumprida só no final).
- CTA único e claro por post.

FRAMEWORK DE CONVERSÃO (use para construir e para pontuar):
- Funis possíveis: CURSO PRESENCIAL (autoridade + "isso se aprende a fundo no curso"), FERRAMENTA DO CATÁLOGO (problema → ferramenta que resolve), AUTORIDADE/MARCA (prova social, bastidores, pilotos patrocinados).
- A nota de conversão reflete o quanto a temática aproxima o seguidor de comprar curso ou ferramenta — não force venda em post de pura audiência; diga qual é o papel do post no funil.

FORMATO DA RESPOSTA: responda APENAS com UM objeto JSON válido (sem markdown, sem comentários), com esta estrutura:
{
  "tipo": "reels" | "carrossel" | "estatico" | "stories",
  "gancho": "frase de abertura que segura os 3 primeiros segundos",
  "engajamento": {"nota": 0-10, "justificativa": "por que essa temática engaja esse público", "gatilhos": ["salvamento", "comentário", ...]},
  "conversao": {"nota": 0-10, "justificativa": "papel do post no funil", "funil": "curso presencial | ferramenta do catálogo | autoridade"},
  "publico": "para quem esse post fala em 1 frase",
  "melhor_horario": "faixa de horário sugerida e por quê (curto)",
  "cenas": [{"tempo": "0-3s", "acao": "o que aparece na tela / enquadramento", "fala": "fala literal, natural, tom de oficina", "texto_tela": "texto sobreposto (curto)"}],
  "slides": [{"n": 1, "titulo": "título do slide", "texto": "texto do slide (curto, escaneável)", "arte": "direção de arte: foto/fundo/destaque"}],
  "foto": {"direcao": "enquadramento, cenário na bancada, peça em destaque, luz", "texto_imagem": "texto sobreposto na imagem"},
  "telas": [{"n": 1, "conteudo": "o que aparece nesse story", "sticker": "enquete/quiz/caixa de pergunta e opções"}],
  "cta": "chamada final única",
  "legenda": "legenda completa e pronta (com quebras de linha), terminando com o CTA",
  "hashtags": "#suspensão #wtech #motocross #manutençãodemoto + 2-3 específicas do tema",
  "trilha": "sugestão de estilo de áudio/trilha",
  "checklist": ["itens práticos de produção: peça a separar, quem aparece, onde gravar, o que validar com Serginho/Alex"]
}

REGRAS DO JSON:
- "tipo" deve respeitar o formato pedido na pauta (video → reels).
- Preencha SOMENTE o bloco do formato: reels → "cenas" (5 a 8 cenas, total 30-45s, com falas LITERAIS); carrossel → "slides" (6 a 9, capa com gancho + último slide de CTA); estatico → "foto"; stories → "telas" (2 a 4).
- Os demais blocos do formato não usado devem ser omitidos.
- Falas e textos em português do Brasil, naturais, sem jargão de marketing.`;

const buildDetailPrompt = (post: ContentPost): string => {
    const dataBR = post.post_date.split('-').reverse().join('/');
    const weekday = WEEKDAY_NAMES[new Date(post.post_date + 'T12:00:00').getDay()];
    return `PAUTA DO POST (transforme em post detalhado):
- Nome do card: ${post.title}
- Data: ${dataBR} (${weekday})
- Formato: ${post.format}
- Categoria: ${post.category}
${post.editorial ? `- Editorial/Quadro: ${post.editorial}` : ''}
${post.content ? `- Ideia: ${post.content}` : ''}
${post.objective ? `- Objetivo: ${post.objective}` : ''}
${post.caption ? `- Rascunho de legenda existente: ${post.caption}` : ''}
${post.obs ? `- Observações: ${post.obs}` : ''}

Gere o objeto JSON do post detalhado.`;
};

/** Extrai o objeto JSON da resposta da IA (tolera cercas de markdown). */
const parseDetailResponse = (raw: string): PostAIDetail => {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('A IA não retornou um JSON válido. Tente gerar novamente.');
    }
    return JSON.parse(cleaned.slice(start, end + 1)) as PostAIDetail;
};

/** Formato do card → tipo esperado no detalhamento. */
const FORMAT_TO_TIPO: Record<ContentPostFormat, PostAIDetail['tipo']> = {
    video: 'reels',
    stories: 'stories',
    carrossel: 'carrossel',
    estatico: 'estatico',
};

/**
 * Gera o POST DETALHADO de um card: roteiro de Reels cena a cena, carrossel
 * slide a slide, direção de foto ou sequência de stories — com notas de
 * engajamento/conversão justificadas pela temática, CTA, legenda final,
 * trilha e checklist de produção. O resultado é persistido em ai_detail
 * pela camada de UI após a geração.
 */
export const generateDetailedPost = async (post: ContentPost): Promise<PostAIDetail> => {
    const raw = await generateContent(buildDetailPrompt(post), DETAIL_SYSTEM_PROMPT);
    const detail = parseDetailResponse(raw);
    // O tipo precisa casar com o formato do card — corrige se a IA escorregar
    detail.tipo = FORMAT_TO_TIPO[post.format] || 'reels';
    return detail;
};

// ─── Geração ─────────────────────────────────────────────────────────────────

/**
 * Gera sugestões de cards para os dias vagos da PRÓXIMA semana (segunda a
 * domingo após a data de referência) + o sábado da semana atual, se vago.
 * Retorna apenas sugestões — quem salva é a aprovação no preview.
 */
export const generateWeekSuggestions = async (
    reference: Date = new Date(),
): Promise<WeekSuggestionResult> => {
    // Contexto: 21 dias para trás, 14 para frente
    const posts = await fetchContentPosts(toISO(addDays(reference, -21)), toISO(addDays(reference, 14)));
    const occupied = new Set(posts.map(p => p.post_date));

    // Próxima semana: segunda seguinte → domingo
    const dow = reference.getDay(); // 0 = domingo
    const nextMonday = addDays(reference, dow === 0 ? 1 : 8 - dow);
    const candidates: Date[] = Array.from({ length: 7 }, (_, i) => addDays(nextMonday, i));

    // Sábado da semana atual, se ainda estiver vago e no futuro
    const currentSaturday = addDays(reference, 6 - dow);
    if (currentSaturday > reference && !occupied.has(toISO(currentSaturday))) {
        candidates.unshift(currentSaturday);
    }

    const emptyDays = candidates
        .filter(d => !occupied.has(toISO(d)))
        .map(d => ({
            date: toISO(d),
            weekday: WEEKDAY_NAMES[d.getDay()],
            type: DAY_TYPE[d.getDay()],
        }));

    if (emptyDays.length === 0) return { suggestions: [], targetDays: [] };

    // O par PERGUNTA/RESPOSTA entra quando qui+sex da próxima semana estão vagos
    const emptySet = new Set(emptyDays.map(d => d.date));
    const quinta = candidates.find(d => d.getDay() === 4);
    const sexta = candidates.find(d => d.getDay() === 5);
    const needsQuizPair = !!(quinta && sexta && emptySet.has(toISO(quinta)) && emptySet.has(toISO(sexta)));

    const raw = await generateContent(buildUserPrompt(posts, emptyDays, needsQuizPair), SYSTEM_PROMPT);
    const suggestions = parseAIResponse(raw)
        .map(r => sanitize(r, emptySet))
        .filter((s): s is ContentPostInput => s !== null);

    if (suggestions.length === 0) {
        throw new Error('A IA não gerou sugestões válidas para os dias vagos. Tente novamente.');
    }

    return { suggestions, targetDays: emptyDays.map(d => d.date) };
};
