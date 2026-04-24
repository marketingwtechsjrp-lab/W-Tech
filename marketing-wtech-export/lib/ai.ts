import { supabase } from './supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type AIProvider = 'openai' | 'gemini';

interface AISettings {
    preferred_ai_provider: AIProvider;
    openai_api_key?: string;
    gemini_api_key?: string;
}

export async function getAISettings(): Promise<AISettings> {
    const { data } = await supabase.from('SITE_SystemSettings').select('*').in('key', [
        'preferred_ai_provider',
        'openai_api_key',
        'gemini_api_key'
    ]);

    const settings: any = {
        preferred_ai_provider: 'gemini' // Default fallback
    };

    data?.forEach(item => {
        settings[item.key] = item.value;
    });

    return settings as AISettings;
}

export async function generateContent(prompt: string, systemPrompt?: string): Promise<string> {
    const settings = await getAISettings();
    const provider = settings.preferred_ai_provider;

    if (provider === 'openai') {
        return generateOpenAI(prompt, settings.openai_api_key || '', systemPrompt);
    } else {
        return generateGemini(prompt, settings.gemini_api_key || '', systemPrompt);
    }
}

async function generateOpenAI(prompt: string, apiKey: string, systemPrompt?: string): Promise<string> {
    if (!apiKey) throw new Error('API Key da OpenAI não configurada.');

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    } catch (error: any) {
        console.error('OpenAI Error:', error);
        throw error;
    }
}

async function generateGemini(prompt: string, apiKey: string, systemPrompt?: string): Promise<string> {
    if (!apiKey) throw new Error('API Key do Gemini não configurada.');

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-pro",
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        console.error('Gemini Error:', error);
        throw error;
    }
}

export async function generateBlogPost(topic: string, keywords: string[]): Promise<any> {
    const systemPrompt = `
        Atue como um especialista em SEO e Mecânica de Motos de Alta Performance.
        Você deve gerar um artigo de blog completo e profissional.
        
        Regras:
        1. O conteúdo deve ser técnico, autoritário, mas acessível.
        2. Use formatação HTML (<h2>, <h3>, <p>, <ul>, <strong>). NÃO use Markdown.
        3. O artigo deve ter entre 500 e 800 words.
        4. Otimize para SEO.

        Retorne APENAS um objeto JSON com a seguinte estrutura (sem markdown code blocks):
        {
          "title": "Título chamativo e otimizado para SEO",
          "slug": "url-amigavel-do-post",
          "seo_description": "Meta description com max 160 caracteres",
          "content": "O corpo do artigo em HTML...",
          "excerpt": "Um resumo curto de 2 linhas",
          "tags": ["tag1", "tag2", "tag3"],
          "image_prompt": "Uma descrição detalhada em inglês para gerar uma imagem fotorealista sobre este artigo"
        }
    `;

    const prompt = `Escreva um artigo sobre o tema: "${topic}". Palavras-chave obrigatórias: ${keywords.join(', ')}.`;

    const response = await generateContent(prompt, systemPrompt);
    
    try {
        // Clean response from code blocks if present
        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Failed to parse AI response as JSON:", response);
        throw new Error("A IA não retornou um JSON válido.");
    }
}

export async function generateSEOContent(siteContext: {
    site_title?: string;
    site_description?: string;
    canonical_url?: string;
    logo_url?: string;
    existing_seo?: Record<string, string>;
}): Promise<Record<string, string>> {
    const systemPrompt = `
Você é um consultor SÊNIOR de SEO com 15+ anos de experiência, especialista em negócios educacionais e automotivos no Brasil.
Sua missão é gerar configurações SEO PERFEITAS e OTIMIZADAS para o site informado.

REGRAS OBRIGATÓRIAS:
1. Title Tag: máximo 60 caracteres, incluir keyword principal + marca
2. Meta Description: máximo 155 caracteres, com CTA implícito, linguagem persuasiva
3. Keywords: 8-12 termos relevantes, long-tail incluídos, separados por vírgula
4. OG Image: manter a URL existente se fornecida (não inventar)
5. Schema: preencher dados realistas baseados no contexto do site
6. Meta Robots: sempre "index, follow" (a menos que haja razão contrária)
7. Use português brasileiro natural e profissional
8. Foque em E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
9. Considere search intent e posicionamento competitivo

Retorne APENAS um JSON válido (sem markdown code blocks) com EXATAMENTE estas chaves:
{
  "seo_title": "...",
  "seo_description": "...",
  "seo_keywords": "...",
  "seo_canonical_url": "...",
  "seo_og_type": "website",
  "seo_site_name": "...",
  "seo_robots": "index, follow",
  "seo_schema_name": "...",
  "seo_schema_type": "EducationalOrganization",
  "seo_schema_phone": "...",
  "seo_schema_email": "...",
  "seo_schema_address": "..."
}
    `;

    const prompt = `
Analise o seguinte site e gere as configurações SEO otimizadas:

CONTEXTO DO SITE:
- Nome: ${siteContext.site_title || 'Não definido'}
- Descrição atual: ${siteContext.site_description || 'Não definida'}
- URL: ${siteContext.canonical_url || 'Não definida'}
- Logo: ${siteContext.logo_url || 'Não definido'}

CONFIGURAÇÕES SEO ATUAIS (melhore onde necessário):
${JSON.stringify(siteContext.existing_seo || {}, null, 2)}

Gere as configurações SEO PERFEITAS para maximizar visibilidade, CTR e autoridade nos resultados do Google Brasil.
    `;

    const response = await generateContent(prompt, systemPrompt);

    try {
        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Failed to parse SEO AI response:", response);
        throw new Error("A IA não retornou um JSON válido para SEO.");
    }
}
