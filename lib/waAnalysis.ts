import { supabase } from './supabaseClient';
import { generateContent } from './ai';

/**
 * Análise de bastidor + aprendizado (RAG) de uma conversa do WhatsApp.
 * Roda no cliente (best-effort) quando a conversa é assumida, transferida ou
 * encerrada. Gera resumo/sentimento/tópicos/prioridade/ação e, quando a conversa
 * foi resolvida, guarda o par pergunta→resposta na memória RAG com embedding.
 *
 * Embeddings: Gemini text-embedding-004 (768 dims), mesma dimensão da coluna
 * vector(768). Se não houver chave Gemini, grava a memória sem embedding (ainda
 * fica registrada; só não entra na busca por similaridade).
 */

async function getGeminiKey(): Promise<string> {
  try {
    const { data } = await supabase
      .from('SITE_SystemSettings')
      .select('value')
      .eq('key', 'gemini_api_key')
      .maybeSingle();
    return (data?.value || '').trim();
  } catch {
    return '';
  }
}

async function embedClient(text: string): Promise<number[] | null> {
  const key = await getGeminiKey();
  if (!key) return null;
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text: text.slice(0, 8000) }] } }),
      }
    );
    const d = await r.json();
    const values = d?.embedding?.values;
    return Array.isArray(values) ? values : null;
  } catch {
    return null;
  }
}

export async function analyzeAndLearn(conversationId: string): Promise<void> {
  try {
    const { data: msgs } = await supabase
      .from('SITE_WhatsAppCloudMessages')
      .select('direction, body')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true })
      .limit(40);

    const transcript = (msgs || [])
      .filter((m: any) => m.body)
      .map((m: any) => `${m.direction === 'in' ? 'Cliente' : 'Atendente'}: ${m.body}`)
      .join('\n');
    if (!transcript) return;

    const system = `Você analisa um atendimento de WhatsApp e devolve APENAS um JSON válido (sem markdown), com exatamente estas chaves:
{
  "summary": "resumo do atendimento em 1-2 frases",
  "sentiment": "positivo | neutro | negativo",
  "topics": ["tópico curto", "..."],
  "priority": "baixa | media | alta",
  "suggested_action": "próxima ação recomendada para a equipe",
  "learned_question": "a principal dúvida do cliente, OU string vazia se não houver",
  "learned_answer": "a resposta que de fato resolveu a dúvida, OU string vazia se não foi resolvida"
}`;

    const raw = await generateContent(transcript, system);
    let a: any;
    try {
      a = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch {
      return;
    }

    await supabase
      .from('SITE_WhatsAppCloudConversations')
      .update({
        ai_summary: a.summary || null,
        ai_sentiment: a.sentiment || null,
        ai_topics: Array.isArray(a.topics) ? a.topics : null,
        ai_priority: a.priority || null,
        ai_suggested_action: a.suggested_action || null,
        ai_last_analyzed_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    // Aprendizado: só guarda quando há uma resposta que resolveu.
    if (a.learned_question && a.learned_answer) {
      const content = `Pergunta: ${a.learned_question}\nResposta: ${a.learned_answer}`;
      const embedding = await embedClient(content);
      await supabase.from('SITE_WhatsAppAIMemory').insert({
        conversation_id: conversationId,
        intent: 'general',
        question: a.learned_question,
        answer: a.learned_answer,
        content,
        embedding,
        source: 'conversation',
      });
    }
  } catch (e) {
    console.error('[waAnalysis] falhou:', e);
  }
}
