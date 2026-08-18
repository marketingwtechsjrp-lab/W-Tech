import { createClient } from '@supabase/supabase-js';
import { requireSameOrigin } from './_auth.js';
import { requireStaffOrS2SPermission } from './_s2s.js';

/**
 * Vercel Serverless Function — Lançamento de curso por cidade/região.
 * URL: /api/launch-course-campaign
 *
 * Antes deste corte, esta rota era pública — qualquer um conseguia disparar
 * um lançamento de e-mail em massa pra até 500 leads por chamada. Agora
 * exige sessão de staff (browser, com gate CSRF) OU chamada S2S assinada do
 * ERP, nos dois casos com a permissão `marketing_manage_campaigns`.
 *
 * POST { courseId, dryRun?: boolean }
 *
 * 1. Busca o curso (cidade/estado/data) e a LP vinculada.
 * 2. Segmenta a base de SITE_Leads por propensão geográfica:
 *    - Cidade igual à do curso (alta propensão)
 *    - Estado igual (média propensão)
 *    Inclui leads perdidos (reaquecimento) — exclui apenas sem e-mail.
 * 3. Cria um fluxo "Lançamento — {curso}" (3 e-mails: anúncio, prova social,
 *    última chamada) e inscreve os leads. O cron diário processa os envios.
 *
 * dryRun=true → só retorna a contagem do público, sem criar nada.
 */

const MAX_AUDIENCE = 500; // trava de segurança por lançamento

function getServiceClient() {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error('Supabase env vars ausentes');
    return createClient(url, serviceKey);
}

const p = (t: string) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#333333;">${t}</p>`;
const h1 = (t: string) => `<h1 style="margin:0 0 16px;font-size:20px;color:#111111;">${t}</h1>`;
const btn = (href: string, label: string) =>
    `<p style="text-align:center;margin:22px 0;"><a href="${href}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-weight:bold;font-size:13px;padding:12px 24px;border-radius:10px;">${label}</a></p>`;

const fmtDate = (d?: string) => {
    if (!d) return 'em breve';
    const [y, m, day] = String(d).slice(0, 10).split('-');
    return `${day}/${m}/${y}`;
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const svcHeader = String(req.headers?.['x-wtech-svc'] || '');
    if (!svcHeader && !requireSameOrigin(req, res)) return;
    if (!(await requireStaffOrS2SPermission(req, res, 'marketing_manage_campaigns'))) return;

    const courseId = (req.body?.courseId as string | undefined)?.trim();
    const dryRun = req.body?.dryRun === true;
    if (!courseId) return res.status(400).json({ error: 'courseId é obrigatório' });

    try {
        const supabase: any = getServiceClient();

        // 1. Curso + LP vinculada
        const { data: course } = await supabase
            .from('SITE_Courses')
            .select('id, title, city, state, date, date_end, status')
            .eq('id', courseId)
            .maybeSingle();
        if (!course) return res.status(404).json({ error: 'Curso não encontrado' });
        if (!course.city) return res.status(400).json({ error: 'Curso sem cidade definida — preencha a cidade antes de lançar.' });

        const { data: lpRow } = await supabase
            .from('SITE_LandingPages')
            .select('slug, template')
            .eq('course_id', courseId)
            .maybeSingle();
        const tpl = lpRow?.template || 'v1';
        const lpPath = tpl === 'v1' ? 'lp' : `lp${String(tpl).replace('v', '')}`;
        // Domínio canônico: site.w-techbrasil.com.br responde 308 e cada link de
        // campanha sairia com um salto extra (ver lib/publicUrl.ts).
        const lpUrl = `https://w-techbrasil.com.br/${lpPath}/${lpRow?.slug || courseId}`;

        // 2. Segmentação geográfica (cidade > estado), leads perdidos inclusos
        const city = String(course.city).trim();
        const state = course.state ? String(course.state).trim() : '';

        const { data: cityLeads } = await supabase
            .from('SITE_Leads')
            .select('id, name, email, status, address_city, address_state')
            .ilike('address_city', `%${city}%`)
            .not('email', 'is', null)
            .limit(MAX_AUDIENCE);

        let stateLeads: any[] = [];
        if (state) {
            const { data } = await supabase
                .from('SITE_Leads')
                .select('id, name, email, status, address_city, address_state')
                .ilike('address_state', `%${state}%`)
                .not('email', 'is', null)
                .limit(MAX_AUDIENCE);
            stateLeads = data || [];
        }

        // Dedup por e-mail (cidade tem prioridade)
        const byEmail = new Map<string, any>();
        for (const l of [...(cityLeads || []), ...stateLeads]) {
            const em = (l.email || '').trim().toLowerCase();
            if (em && !byEmail.has(em)) byEmail.set(em, l);
        }
        const audience = Array.from(byEmail.values()).slice(0, MAX_AUDIENCE);

        const breakdown = {
            course: course.title,
            city,
            state,
            cityMatches: (cityLeads || []).length,
            stateMatches: stateLeads.length,
            audienceTotal: audience.length,
            lostIncluded: audience.filter((l) => ['Cold', 'Rejected', 'Lost'].includes(l.status)).length,
            lpUrl
        };

        if (dryRun) return res.status(200).json({ ok: true, dryRun: true, ...breakdown });
        if (audience.length === 0) return res.status(200).json({ ok: true, ...breakdown, message: 'Nenhum lead com cidade/estado compatível na base.' });

        // 3. Cria (ou reusa) o fluxo de lançamento deste curso
        const flowName = `Lançamento — ${course.title} (${city})`;
        let flowId: string;
        const { data: existingFlow } = await supabase.from('SITE_EmailFlows').select('id').eq('name', flowName).maybeSingle();
        if (existingFlow) {
            flowId = existingFlow.id;
        } else {
            const dateStr = fmtDate(course.date);
            const { data: flow, error: fErr } = await supabase.from('SITE_EmailFlows').insert({
                name: flowName,
                description: `Cadência de lançamento do curso em ${city}. Criada automaticamente em ${new Date().toLocaleDateString('pt-BR')}.`,
                trigger_type: 'Segmento',
                trigger_config: { course_id: courseId, city, state },
                status: 'Active',
                tags: ['lancamento', city.toLowerCase().replace(/\s+/g, '_')]
            }).select('id').single();
            if (fErr) return res.status(500).json({ error: `Falha ao criar fluxo: ${fErr.message}` });
            flowId = flow.id;

            const steps = [
                { flow_id: flowId, step_order: 1, type: 'Email', config: {
                    subject: `🏍️ W-Tech em ${city}: turma confirmada em ${dateStr}`,
                    body: h1(`A W-Tech vai até você, {{nome}}!`)
                        + p(`Confirmamos uma turma presencial do <strong>${course.title}</strong> em <strong>${city}${state ? ' - ' + state : ''}</strong>, no dia <strong>${dateStr}</strong>.`)
                        + p('Você demonstrou interesse em suspensão — e treinamento presencial na sua região é exatamente a oportunidade que costuma demorar a voltar.')
                        + p('✔ 100% prático, na bancada<br/>✔ Certificado oficial W-Tech<br/>✔ Vagas limitadas pela capacidade do local')
                        + btn(lpUrl, 'Ver detalhes e garantir vaga') } },
                { flow_id: flowId, step_order: 2, type: 'Delay', config: { value: 3, unit: 'days' } },
                { flow_id: flowId, step_order: 3, type: 'Email', config: {
                    subject: `Quem fez o curso da W-Tech não volta a ser o mesmo mecânico`,
                    body: h1('O que muda depois do treinamento')
                        + p(`{{nome}}, mais de 5.000 mecânicos já passaram pelas nossas bancadas. O padrão se repete: quem domina suspensão para de disputar preço e vira referência na região.`)
                        + p(`A turma de <strong>${city}</strong> está preenchendo — e o local define o limite de vagas.`)
                        + p('Se está pesando o investimento: há opção de <strong>reserva de vaga com sinal</strong> e parcelamento direto na página.')
                        + btn(lpUrl, `Garantir vaga em ${city}`) } },
                { flow_id: flowId, step_order: 4, type: 'Delay', config: { value: 4, unit: 'days' } },
                { flow_id: flowId, step_order: 5, type: 'Email', config: {
                    subject: `Última chamada: ${city} (${dateStr})`,
                    body: h1('Depois dessa, só na próxima rota')
                        + p(`{{nome}}, este é o último aviso sobre a turma de <strong>${city}</strong> em <strong>${dateStr}</strong>.`)
                        + p('Quando a agenda da região fecha, a próxima oportunidade costuma demorar <strong>meses</strong> — e quem entra agora sai na frente da concorrência local.')
                        + p('Se ficou qualquer dúvida (conteúdo, valor, estrutura), responda este e-mail ou chame no WhatsApp. A equipe resolve em minutos.')
                        + btn(lpUrl, 'Quero minha vaga') } }
            ];
            const { error: sErr } = await supabase.from('SITE_FlowSteps').insert(steps);
            if (sErr) return res.status(500).json({ error: `Falha ao criar passos: ${sErr.message}` });
        }

        // 4. Inscreve o público (idempotente por inscrição ativa)
        let enrolled = 0;
        for (const lead of audience) {
            const email = lead.email.trim().toLowerCase();
            const { data: existing } = await supabase
                .from('SITE_FlowEnrollments')
                .select('id')
                .eq('flow_id', flowId)
                .eq('contact_email', email)
                .limit(1)
                .maybeSingle();
            if (existing) continue;
            const { error } = await supabase.from('SITE_FlowEnrollments').insert([{
                flow_id: flowId,
                contact_email: email,
                contact_name: lead.name || null,
                current_step_order: 0,
                status: 'Active',
                next_run_at: new Date().toISOString()
            }]);
            if (!error) enrolled++;
        }

        console.log(`[Launch] ${flowName}: público=${audience.length} inscritos=${enrolled}`);
        return res.status(200).json({ ok: true, ...breakdown, flowId, enrolled });
    } catch (e: any) {
        console.error('[Launch] erro:', e?.message);
        return res.status(500).json({ ok: false, error: e?.message });
    }
}
