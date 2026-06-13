import { createClient } from '@supabase/supabase-js';
import { sendEmail, sendTemplate } from './_email.js';
import { sendWhatsAppText } from './_whatsapp.js';
import { renderRawEmail } from '../lib/emailTemplates.js';

/**
 * Disparo MANUAL de mensagens para alunos de um curso (acionado pelo admin).
 * Arquivo com prefixo "_" — helper compartilhado (não vira rota).
 *
 * Dois tipos de envio:
 *   - 'balance'      → cobrança do saldo pendente da inscrição
 *   - 'course-info'  → logística do curso (endereço, data, horário, o que levar)
 *
 * Cada um pode sair por e-mail (Brevo), WhatsApp (instância de automação) ou
 * ambos. Escopo: uma inscrição (enrollmentId) ou todos os alunos do curso.
 *
 * Anti-bloqueio do WhatsApp (igual ao resto do sistema): teto por requisição,
 * intervalo aleatório entre envios e variação de texto. Como roda no servidor,
 * não depende da aba do admin ficar aberta.
 */

const MAX_WA_PER_REQUEST = 20;       // resto fica para um novo clique
const WA_DELAY_MIN_MS = 4_000;
const WA_DELAY_MAX_MS = 10_000;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const randomBetween = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const fmtMoney = (n: number) => Number(n || 0).toFixed(2).replace('.', ',');
const fmtDate = (d?: string) => {
    if (!d) return 'A definir';
    const [y, m, day] = String(d).slice(0, 10).split('-');
    return `${day}/${m}/${y}`;
};
const symbolOf = (cur?: string) => {
    const c = (cur || 'BRL').toUpperCase();
    return c === 'EUR' ? '€' : c === 'USD' ? '$' : 'R$';
};

export type NotifyAction = 'balance' | 'course-info';
export type NotifyChannel = 'whatsapp' | 'email' | 'both';

export interface NotifyInput {
    courseId: string;
    action: NotifyAction;
    channel: NotifyChannel;
    enrollmentId?: string;   // ausente = todos os alunos elegíveis do curso
}

export interface NotifyResult {
    ok: boolean;
    action: NotifyAction;
    channel: NotifyChannel;
    eligible: number;
    emailsSent: number;
    whatsappSent: number;
    failed: number;
    whatsappRemaining: number;   // > 0 quando o teto por requisição foi atingido
    skipped?: string;
    details: Array<{ student: string; email: string; whatsapp: string }>;
    error?: string;
}

function getServiceClient() {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error('Supabase env vars ausentes');
    return createClient(url, serviceKey);
}

// ── Construtores de mensagem ─────────────────────────────────────────────────

function buildBalanceWhatsApp(input: {
    firstName: string; courseTitle: string; courseDate: string;
    remaining: string; paid: string; total: string; symbol: string;
}): string {
    const { firstName, courseTitle, courseDate, remaining, paid, total, symbol } = input;
    const header = pick([
        `Olá, ${firstName}! Aqui é da equipe W-Tech Brasil 👋`,
        `Oi ${firstName}, tudo bem? Sou da equipe W-Tech Brasil 🛠️`,
        `${firstName}, tudo certo? Aqui é do suporte da W-Tech Brasil 👊`
    ]);
    const saldo = pick([
        `Sua vaga no curso *${courseTitle}* (${courseDate}) está confirmada, e consta um saldo em aberto na inscrição:\n\n✅ Pago: ${symbol} ${paid}\n💰 Total: ${symbol} ${total}\n⏳ *Restante: ${symbol} ${remaining}*`,
        `Vi aqui que sua inscrição no *${courseTitle}* (${courseDate}) está garantida, mas ainda falta uma parte do pagamento:\n\n💰 Valor do curso: ${symbol} ${total}\n✅ Você já pagou: ${symbol} ${paid}\n⏳ *Falta: ${symbol} ${remaining}*`
    ]);
    const cta = pick([
        `Quer deixar isso resolvido? Me responde aqui que te mando o Pix ou o link do cartão na hora — aceitamos parcelamento também. 🤝`,
        `Quando quiser quitar, é só responder esta mensagem — te passo as opções de pagamento (Pix, cartão ou parcelado). 😊`,
        `Me chama por aqui que organizo o restante com você, do jeito que ficar melhor (Pix, cartão ou parcelado). 👍`
    ]);
    return `${header}\n\n${saldo}\n\n${cta}`;
}

function buildCourseInfoWhatsApp(c: any, firstName: string): string {
    const mapsLink = c.latitude ? `https://www.google.com/maps?q=${c.latitude},${c.longitude}` : (c.map_url || '');
    const addressLine = [c.address, c.city, c.state].filter(Boolean).join(', ') || c.location || 'A definir';
    return `Olá *${firstName}*! Tudo bem? 🏍️\n\n` +
        `*Informações do curso: ${c.title}*\n\n` +
        `📅 *Data:* ${fmtDate(c.date)}\n` +
        `⏰ *Horário:* ${c.start_time || '08:00'} às ${c.end_time || '18:00'} (chegue 30min antes para o credenciamento)\n` +
        `📍 *Endereço:* ${addressLine}\n` +
        (mapsLink ? `🔗 *Ver no mapa:* ${mapsLink}\n` : '') +
        (c.schedule ? `\n📝 *Cronograma:*\n${c.schedule}\n` : '') +
        (c.what_to_bring ? `\n🎒 *O que levar:*\n${c.what_to_bring}\n` : '') +
        (c.whatsapp_group_link ? `\n👥 *Grupo da turma:* ${c.whatsapp_group_link}\n` : '') +
        `\nW-TECH Brasil Experience — te esperamos lá! 🏁`;
}

function buildCourseInfoEmail(c: any, firstName: string): { subject: string; bodyHtml: string } {
    const mapsLink = c.latitude ? `https://www.google.com/maps?q=${c.latitude},${c.longitude}` : (c.map_url || '');
    const addressLine = [c.address, c.city, c.state].filter(Boolean).join(', ') || c.location || 'A definir';
    const row = (label: string, value: string) =>
        `<tr><td style="padding:6px 0;font-size:14px;color:#666;width:120px;vertical-align:top;"><strong>${label}</strong></td>` +
        `<td style="padding:6px 0;font-size:14px;color:#222;">${value}</td></tr>`;
    const bodyHtml =
        `<p style="margin:0 0 14px;font-size:15px;color:#222;">Olá, <strong>${firstName}</strong>! 🏍️</p>` +
        `<p style="margin:0 0 18px;font-size:14px;color:#444;line-height:1.6;">Seguem as informações do seu curso. Guarde este e-mail e chegue com calma no dia.</p>` +
        `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">` +
        row('Curso', c.title) +
        row('Data', fmtDate(c.date)) +
        row('Horário', `${c.start_time || '08:00'} às ${c.end_time || '18:00'} <span style="color:#888;">(chegue 30min antes)</span>`) +
        row('Endereço', addressLine + (mapsLink ? ` — <a href="${mapsLink}" style="color:#b8860b;">ver no mapa</a>` : '')) +
        (c.what_to_bring ? row('O que levar', String(c.what_to_bring).replace(/\n/g, '<br/>')) : '') +
        (c.schedule ? row('Cronograma', String(c.schedule).replace(/\n/g, '<br/>')) : '') +
        (c.whatsapp_group_link ? row('Grupo', `<a href="${c.whatsapp_group_link}" style="color:#b8860b;">entrar no grupo da turma</a>`) : '') +
        `</table>` +
        `<p style="margin:0;font-size:14px;color:#444;">Qualquer dúvida, é só responder este e-mail. Te esperamos lá! 🏁</p>`;
    return { subject: `📍 Informações do curso ${c.title} — ${fmtDate(c.date)}`, bodyHtml };
}

// ── Processador principal ────────────────────────────────────────────────────

export async function processNotify(input: NotifyInput): Promise<NotifyResult> {
    const supabase: any = getServiceClient();
    const result: NotifyResult = {
        ok: true, action: input.action, channel: input.channel,
        eligible: 0, emailsSent: 0, whatsappSent: 0, failed: 0,
        whatsappRemaining: 0, details: []
    };

    const wantEmail = input.channel === 'email' || input.channel === 'both';
    const wantWhatsApp = input.channel === 'whatsapp' || input.channel === 'both';

    // Curso (colunas cruas)
    const { data: course } = await supabase
        .from('SITE_Courses')
        .select('id, title, date, start_time, end_time, address, city, state, location, map_url, latitude, longitude, schedule, what_to_bring, whatsapp_group_link, currency, price')
        .eq('id', input.courseId)
        .maybeSingle();
    if (!course) return { ...result, ok: false, error: 'Curso não encontrado' };

    // Inscrições
    let query = supabase
        .from('SITE_Enrollments')
        .select('id, student_name, student_email, student_phone, status, amount_paid, total_amount')
        .eq('course_id', input.courseId);
    if (input.enrollmentId) query = query.eq('id', input.enrollmentId);

    const { data: enrollments, error } = await query;
    if (error) return { ...result, ok: false, error: `Falha ao buscar inscrições: ${error.message}` };

    const symbol = symbolOf(course.currency);
    let waSentThisRun = 0;
    let waPending = 0;

    for (const enr of (enrollments || []) as any[]) {
        const paid = Number(enr.amount_paid || 0);
        const total = Number(enr.total_amount ?? course.price ?? 0);
        const remaining = total - paid;

        // 'balance' só faz sentido para quem tem saldo em aberto
        if (input.action === 'balance' && remaining <= 0) continue;

        result.eligible++;
        const firstName = (enr.student_name || '').split(' ')[0] || 'Aluno';
        const hasEmail = !!enr.student_email;
        const hasPhone = !!enr.student_phone;

        let emailStatus = 'pulado';
        let waStatus = 'pulado';

        // ── E-mail ───────────────────────────────────────────────────────────
        if (wantEmail && hasEmail) {
            try {
                if (input.action === 'balance') {
                    const sent = await sendTemplate(
                        enr.student_email,
                        'saldo_pendente',
                        {
                            studentName: firstName,
                            courseTitle: course.title || 'Curso W-Tech',
                            courseDate: fmtDate(course.date),
                            courseLocation: [course.city, course.state].filter(Boolean).join(', ') || 'A definir',
                            amountPaid: fmtMoney(paid),
                            totalAmount: fmtMoney(total),
                            remainingBalance: fmtMoney(remaining),
                            currencySymbol: symbol,
                            whatsappLink: '#',
                            stage: 1,
                            daysToCourse: ''
                        },
                        { type: 'cobranca_manual', enrollmentId: enr.id }
                    );
                    emailStatus = sent.sent ? 'enviado' : (sent.skipped || sent.error || 'falhou');
                    if (sent.sent) result.emailsSent++; else if (sent.error) result.failed++;
                } else {
                    const { subject, bodyHtml } = buildCourseInfoEmail(course, firstName);
                    const { subject: subj, html } = renderRawEmail(subject, bodyHtml, {});
                    const sent = await sendEmail({ to: enr.student_email, subject: subj, html, type: 'info_curso_manual', enrollmentId: enr.id });
                    emailStatus = sent.sent ? 'enviado' : (sent.skipped || sent.error || 'falhou');
                    if (sent.sent) result.emailsSent++; else if (sent.error) result.failed++;
                }
            } catch (e: any) {
                emailStatus = `erro: ${e?.message}`;
                result.failed++;
            }
        } else if (wantEmail && !hasEmail) {
            emailStatus = 'sem e-mail';
        }

        // ── WhatsApp (teto + ritmo humano) ────────────────────────────────────
        if (wantWhatsApp && hasPhone) {
            if (waSentThisRun >= MAX_WA_PER_REQUEST) {
                waStatus = 'adiado (teto anti-bloqueio)';
                waPending++;
            } else {
                try {
                    if (waSentThisRun > 0) await sleep(randomBetween(WA_DELAY_MIN_MS, WA_DELAY_MAX_MS));
                    const message = input.action === 'balance'
                        ? buildBalanceWhatsApp({
                            firstName,
                            courseTitle: course.title || 'Curso W-Tech',
                            courseDate: fmtDate(course.date),
                            remaining: fmtMoney(remaining),
                            paid: fmtMoney(paid),
                            total: fmtMoney(total),
                            symbol
                        })
                        : buildCourseInfoWhatsApp(course, firstName);
                    const sent = await sendWhatsAppText(enr.student_phone, message);
                    waStatus = sent.sent ? 'enviado' : (sent.skipped || sent.error || 'falhou');
                    if (sent.sent) { result.whatsappSent++; waSentThisRun++; }
                    else if (sent.error) result.failed++;
                } catch (e: any) {
                    waStatus = `erro: ${e?.message}`;
                    result.failed++;
                }
            }
        } else if (wantWhatsApp && !hasPhone) {
            waStatus = 'sem telefone';
        }

        result.details.push({
            student: `${enr.student_name}${input.action === 'balance' ? ` (${symbol} ${fmtMoney(remaining)} restante)` : ''}`,
            email: emailStatus,
            whatsapp: waStatus
        });
    }

    result.whatsappRemaining = waPending;
    return result;
}
