import { callLLM, loadAIKeys } from './_aiReply.js';
import { denyAuth, getServiceClient, requireStaffSession, requireSameOrigin } from './_auth.js';

type GlossaryOrigin = 'MANUAL' | 'AI_GEMINI' | 'AI_OPENAI' | 'AI_OPENROUTER' | 'CSV_IMPORT';

type GlossaryRow = {
  id: string;
  term: string;
  slug: string;
  letter: string;
  niche: string | null;
  category: string | null;
  content: string;
  summary: string | null;
  seo_title: string | null;
  image: string | null;
  author: string;
  origin: GlossaryOrigin;
  published: boolean;
  reviewed: boolean;
  views: number;
  created_at: string;
  updated_at: string;
};

const TABLE = 'SITE_GlossaryTerms';
const DEFAULT_NICHE = 'suspensão de motocicletas off-road e on-road, preparação, manutenção e pilotagem';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function firstLetter(value: string): string {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const first = normalized.charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : '0-9';
}

function cleanJsonResponse(value: string): string {
  let cleaned = String(value || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) return cleaned.slice(start, end + 1);
  cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  return cleaned;
}

function originForProvider(provider: string): GlossaryOrigin {
  if (provider === 'openai') return 'AI_OPENAI';
  if (provider === 'openrouter') return 'AI_OPENROUTER';
  return 'AI_GEMINI';
}

function migrationError(error: any): boolean {
  return error?.code === '42P01' || /SITE_GlossaryTerms/i.test(String(error?.message || ''));
}

function defaultModel(provider: string, configuredOpenRouter?: string): string {
  if (provider === 'openai') return 'gpt-4o-mini';
  if (provider === 'openrouter') return configuredOpenRouter || 'google/gemini-2.0-flash-001';
  return 'gemini-2.0-flash';
}

async function uniqueSlug(supabase: any, term: string, currentId?: string): Promise<string> {
  const base = slugify(term) || `termo-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (true) {
    let query = supabase.from(TABLE).select('id').eq('slug', candidate).limit(1);
    if (currentId) query = query.neq('id', currentId);
    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

async function listTerms(supabase: any) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('term', { ascending: true });
  if (error) throw error;
  return (data || []) as GlossaryRow[];
}

async function canManageGlossary(supabase: any, userId: string): Promise<boolean> {
  const { data: user, error } = await supabase
    .from('SITE_Users')
    .select('permissions, role_id')
    .eq('id', userId)
    .maybeSingle();
  if (error || !user) return false;

  let rolePermissions: Record<string, boolean> = {};
  if (user.role_id) {
    const { data: role } = await supabase
      .from('SITE_Roles')
      .select('permissions')
      .eq('id', user.role_id)
      .maybeSingle();
    rolePermissions = role?.permissions || {};
  }

  const permissions = { ...rolePermissions, ...(user.permissions || {}) };
  return Boolean(
    permissions.admin_access
    || permissions.marketing_view
    || permissions.manage_marketing
    || permissions.blog_ai,
  );
}

async function createManualTerm(supabase: any, body: any) {
  const term = String(body.term || '').trim();
  if (!term) throw new Error('Informe o nome do termo.');

  const slug = await uniqueSlug(supabase, term);
  const summary = String(body.summary || '').trim() || null;
  const content = String(body.content || '').trim();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      term,
      slug,
      letter: firstLetter(term),
      niche: String(body.niche || DEFAULT_NICHE).trim(),
      category: String(body.category || '').trim() || null,
      content,
      summary,
      seo_title: String(body.seo_title || '').trim() || null,
      origin: 'MANUAL',
      published: Boolean(body.published && content),
      reviewed: Boolean(body.reviewed),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as GlossaryRow;
}

async function suggestTerms(supabase: any, body: any) {
  const niche = String(body.niche || DEFAULT_NICHE).trim();
  const letter = firstLetter(String(body.letter || 'A'));
  const quantity = Math.max(5, Math.min(50, Number(body.quantity) || 20));
  const prefix = String(body.prefix || 'Nenhum').trim();
  const extra = String(body.instructions || '').trim();
  const providerOverride = body.provider && body.provider !== 'system' ? String(body.provider) : null;
  const keys = await loadAIKeys(supabase, providerOverride);
  const model = String(body.model || '').trim() || defaultModel(keys.provider, keys.openrouterModel);

  const prefixInstruction = prefix && prefix !== 'Nenhum'
    ? `Cada sugestão deve começar com "${prefix}" e a palavra principal seguinte deve começar com a letra ${letter}.`
    : `Cada sugestão deve começar diretamente com a letra ${letter}, sem prefixo genérico.`;

  const system = `Você é especialista em SEO técnico e engenharia de suspensão de motocicletas.
Crie pautas de glossário úteis, específicas e factualmente corretas. Responda somente JSON válido.`;
  const prompt = `Sugira exatamente ${quantity} verbetes únicos para o glossário da W-Tech.
Nicho: ${niche}
Letra: ${letter}
${prefixInstruction}
Evite termos vagos, repetidos, marcas inventadas e tópicos fora de suspensão, manutenção ou pilotagem.
Não use aspas duplas dentro dos nomes.
${extra ? `Instruções adicionais: ${extra}` : ''}

Retorne estritamente:
{"terms":["Termo 1","Termo 2"]}`;

  const raw = await callLLM(keys, system, prompt, model);
  const parsed = JSON.parse(cleanJsonResponse(raw));
  const suggestions = Array.isArray(parsed.terms)
    ? parsed.terms
    : Array.isArray(parsed.termos)
      ? parsed.termos
      : [];

  const normalizedSuggestions: string[] = suggestions
    .map((item: unknown) => String(item || '').trim())
    .filter((item: string) => item.length >= 2);
  const unique: string[] = Array.from(new Set<string>(normalizedSuggestions)).slice(0, quantity);

  if (!unique.length) throw new Error('A IA não retornou termos válidos.');

  const payload = unique.map((term) => ({
    term,
    slug: slugify(term),
    letter: firstLetter(term),
    niche,
    content: '',
    origin: originForProvider(keys.provider),
    published: false,
    reviewed: false,
  }));

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'slug', ignoreDuplicates: true })
    .select('*');
  if (error) throw error;

  return {
    suggested: unique.length,
    inserted: data?.length || 0,
    provider: keys.provider,
    model,
  };
}

async function generateDefinition(supabase: any, body: any) {
  const id = String(body.id || '').trim();
  if (!id) throw new Error('Termo não informado.');

  const { data: term, error: findError } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (findError) throw findError;
  if (!term) throw new Error('Termo não encontrado.');

  const providerOverride = body.provider && body.provider !== 'system' ? String(body.provider) : null;
  const keys = await loadAIKeys(supabase, providerOverride);
  const model = String(body.model || '').trim() || defaultModel(keys.provider, keys.openrouterModel);
  const niche = term.niche || DEFAULT_NICHE;

  const system = `Você é redator técnico sênior da W-Tech Brasil, referência em suspensão de motocicletas.
Produza conteúdo factual, didático, seguro e otimizado para mecanismos de busca. Responda somente JSON válido.`;
  const prompt = `Escreva um verbete completo para o glossário técnico da W-Tech.

Termo: ${term.term}
Contexto: ${niche}

Requisitos:
- Entre 450 e 700 palavras, em português do Brasil.
- Comece respondendo diretamente o que o termo significa.
- Use HTML semântico somente com <p>, <h2>, <h3>, <ul>, <li> e <strong>.
- Explique funcionamento, aplicação prática, ajustes ou diagnóstico quando pertinente.
- Diferencie conceitos que costumam ser confundidos.
- Não invente números, normas, produtos ou recomendações do fabricante.
- Não use Markdown, <html>, <body>, scripts, links ou atributos HTML.
- Gere um título SEO com até 60 caracteres e uma descrição com até 155 caracteres.

Retorne estritamente:
{"content":"<p>...</p>","seoTitle":"...","summary":"..."}`;

  const raw = await callLLM(keys, system, prompt, model);
  const parsed = JSON.parse(cleanJsonResponse(raw));
  const content = String(parsed.content || parsed.conteudo || '').trim();
  const summary = String(parsed.summary || parsed.resumo || '').trim();
  const seoTitle = String(parsed.seoTitle || parsed.seo_title || '').trim();
  if (!content) throw new Error('A IA retornou uma definição vazia.');

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      content,
      summary: summary.slice(0, 160) || `Entenda ${term.term} no glossário técnico da W-Tech Brasil.`,
      seo_title: seoTitle.slice(0, 70) || `${term.term} — Glossário W-Tech`,
      origin: originForProvider(keys.provider),
      published: true,
      reviewed: false,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;

  return { term: data as GlossaryRow, provider: keys.provider, model };
}

async function updateTerm(supabase: any, body: any) {
  const id = String(body.id || '').trim();
  if (!id) throw new Error('Termo não informado.');

  const updates: Record<string, unknown> = {};
  const allowedText = ['niche', 'category', 'content', 'summary', 'seo_title', 'image', 'author'];
  for (const key of allowedText) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updates[key] = String(body[key] || '').trim() || null;
    }
  }
  for (const key of ['published', 'reviewed']) {
    if (Object.prototype.hasOwnProperty.call(body, key)) updates[key] = Boolean(body[key]);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'term')) {
    const term = String(body.term || '').trim();
    if (!term) throw new Error('O nome do termo não pode ficar vazio.');
    updates.term = term;
    updates.slug = await uniqueSlug(supabase, term, id);
    updates.letter = firstLetter(term);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as GlossaryRow;
}

export default async function handler(req: any, res: any) {
  // Gate CSRF fail-closed nas mutações (a sessão vive num cookie httpOnly,
  // que o browser manda sozinho mesmo em pedido disparado por outro site).
  if (req.method !== 'GET' && !requireSameOrigin(req, res)) return;

  const staff = await requireStaffSession(req);
  if (!staff) return denyAuth(res);
  const userId = staff.id;

  const supabase = getServiceClient();
  if (!supabase) {
    return res.status(503).json({ success: false, error: 'Banco administrativo não configurado no servidor.' });
  }
  if (!await canManageGlossary(supabase, userId)) {
    return res.status(403).json({ success: false, error: 'Você não possui permissão para gerenciar o glossário.' });
  }

  try {
    if (req.method === 'GET') {
      const [terms, keys] = await Promise.all([listTerms(supabase), loadAIKeys(supabase)]);
      return res.status(200).json({
        success: true,
        terms,
        ai: {
          provider: keys.provider,
          model: defaultModel(keys.provider, keys.openrouterModel),
        },
      });
    }

    if (req.method === 'POST') {
      const action = String(req.body?.action || 'create');
      if (action === 'suggest') {
        const result = await suggestTerms(supabase, req.body || {});
        return res.status(200).json({ success: true, ...result });
      }
      if (action === 'generate') {
        const result = await generateDefinition(supabase, req.body || {});
        return res.status(200).json({ success: true, ...result });
      }
      const term = await createManualTerm(supabase, req.body || {});
      return res.status(201).json({ success: true, term });
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const term = await updateTerm(supabase, req.body || {});
      return res.status(200).json({ success: true, term });
    }

    if (req.method === 'DELETE') {
      const id = String(req.body?.id || req.query?.id || '').trim();
      if (!id) return res.status(400).json({ success: false, error: 'Termo não informado.' });
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, PUT, DELETE');
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  } catch (error: any) {
    console.error('[glossary]', error?.message || error);
    if (migrationError(error)) {
      return res.status(503).json({
        success: false,
        code: 'migration_required',
        error: 'A estrutura do glossário ainda não foi criada. Execute a migração 2026-07-28_add_glossary_generator.sql.',
      });
    }
    const message = String(error?.message || 'Falha ao processar o glossário.');
    const status = /não encontrad|não informado|informe|vazio|obrigat/i.test(message) ? 400 : 500;
    return res.status(status).json({ success: false, error: message });
  }
}
