import { createClient } from '@supabase/supabase-js';
import { sendTemplate, alreadySent } from './_email.js';
import { sendWhatsAppText } from './_whatsapp.js';

/**
 * Lembretes automáticos de SALDO PENDENTE da inscrição.
 * Arquivo com prefixo "_" — helper compartilhado (não vira rota).
 *
 * Público: inscrições Confirmed com amount_paid < total_amount cujo curso
 * ainda vai acontecer. Cadência em 3 estágios, cada um enviado UMA única vez
 * por inscrição (idempotência via SITE_EmailLogs, canais independentes):
 *
 *   1. 2+ dias após a inscrição  — lembrete amigável
 *   2. 9+ dias após a inscrição  — reforço
 *   3. curso a ≤7 dias           — urgência
 *
 * Cada estágio dispara e-mail (Brevo) e WhatsApp (Evolution API). Cada canal
 * respeita seu próprio gate de configuração e falha de um não bloqueia o outro.
 *
 * Kill switch: SITE_Config.saldo_reminders_enabled = 'false' desativa tudo.
 *
 * Escopo (SITE_Config.saldo_reminders_scope):
 *   - 'auto' (padrão) → cobra apenas inscrições geradas automaticamente pelo
 *     sistema (checkout/webhook/landing page), identificadas por
 *     enrolled_by_name = 'Automático'. Inscrições feitas manualmente por um
 *     atendente NÃO recebem cobrança automática.
 *   - 'all' → cobra todas as inscrições com saldo, independente da origem.
 */

const STAGE_1_MIN_DAYS_ENROLLED = 2;
const STAGE_2_MIN_DAYS_ENROLLED = 9;
const STAGE_3_MAX_DAYS_TO_COURSE = 7;

// Marcador gravado em SITE_Enrollments.enrolled_by_name quando a inscrição é
// criada pelo próprio sistema (checkout Mercado Pago, webhooks, landing pages).
// Inscrições manuais gravam o nome do atendente. Veja add_enrolled_by.sql.
const SYSTEM_ENROLLED_MARKER = 'Automático';

// ── Anti-bloqueio do WhatsApp ───────────────────────────────────────────────
// Mensagens idênticas em sequência rápida derrubam o número. Por isso:
//  - teto de envios de WhatsApp por execução (o resto fica para o dia seguinte)
//  - intervalo aleatório entre envios (parece digitação humana)
//  - 3 variantes de texto por estágio, sorteadas por contato
const MAX_WA_SENDS_PER_RUN = 6;
const WA_DELAY_MIN_MS = 8_000;
const WA_DELAY_MAX_MS = 20_000;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const randomBetween = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export interface BalanceRunResult {
    scanned: number;
    eligible: number;
    emailsSent: number;
    whatsappSent: number;
    errors: number;
    skipped?: string;
    scope?: 'auto' | 'all';
    details: Array<{
        enrollmentId: string;
        student: string;
        stage: number;
        email: string;
        whatsapp: string;
    }>;
}

function getServiceClient() {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error('Supabase env vars ausentes');
    return createClient(url, serviceKey);
}

const DAY_MS = 86_400_000;
const daysBetween = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / DAY_MS);

const fmtMoney = (n: number) => Number(n || 0).toFixed(2).replace('.', ',');
const fmtDate = (d?: string) => {
    if (!d) return 'A definir';
    const [y, m, day] = String(d).slice(0, 10).split('-');
    return `${day}/${m}/${y}`;
};

/** Decide o estágio devido para uma inscrição (0 = nenhum devido agora). */
function dueStage(enrolledAt: Date, courseDate: Date, now: Date): number {
    const daysToCourse = daysBetween(now, courseDate);
    const daysEnrolled = daysBetween(enrolledAt, now);

    if (daysToCourse <= STAGE_3_MAX_DAYS_TO_COURSE) return 3;
    if (daysEnrolled >= STAGE_2_MIN_DAYS_ENROLLED) return 2;
    if (daysEnrolled >= STAGE_1_MIN_DAYS_ENROLLED) return 1;
    return 0;
}

/** Registra envio de WhatsApp em SITE_EmailLogs (idempotência por canal). */
async function logWhatsApp(
    supabase: ReturnType<typeof getServiceClient>,
    enrollmentId: string,
    type: string,
    recipient: string,
    status: 'Sent' | 'Failed',
    errorMessage?: string
): Promise<void> {
    try {
        await supabase.from('SITE_EmailLogs').insert([{
            recipient_email: recipient,
            status,
            error_message: errorMessage || null,
            type,
            subject: 'WhatsApp — lembrete de saldo pendente',
            enrollment_id: enrollmentId
        }]);
    } catch (e: any) {
        console.error('[Saldo] Falha ao registrar log de WhatsApp (não-fatal):', e?.message);
    }
}

function buildWhatsAppMessage(input: {
    firstName: string;
    courseTitle: string;
    courseDate: string;
    remaining: string;
    paid: string;
    total: string;
    symbol: string;
    stage: number;
    daysToCourse: number;
}): string {
    const { firstName, courseTitle, courseDate, remaining, paid, total, symbol, stage, daysToCourse } = input;

    // Variantes sorteadas — nenhum contato recebe texto idêntico ao do vizinho
    const header = pick([
        `Olá, ${firstName}! Aqui é da equipe W-Tech Brasil 👋`,
        `Oi ${firstName}, tudo bem? Sou da equipe W-Tech Brasil 🛠️`,
        `${firstName}, tudo certo? Aqui é do suporte da W-Tech Brasil 👊`
    ]);

    const saldo = pick([
        `Sua vaga no curso *${courseTitle}* (${courseDate}) está confirmada, e consta um saldo em aberto na inscrição:\n\n✅ Pago: ${symbol} ${paid}\n💰 Total: ${symbol} ${total}\n⏳ *Restante: ${symbol} ${remaining}*`,
        `Vi aqui que sua inscrição no *${courseTitle}* (${courseDate}) está garantida, mas ainda falta uma parte do pagamento:\n\n💰 Valor do curso: ${symbol} ${total}\n✅ Você já pagou: ${symbol} ${paid}\n⏳ *Falta: ${symbol} ${remaining}*`,
        `Sobre sua inscrição no curso *${courseTitle}* (${courseDate}): a vaga está reservada e o que falta é só o restante do valor:\n\n✅ Entrada paga: ${symbol} ${paid} de ${symbol} ${total}\n⏳ *Saldo: ${symbol} ${remaining}*`
    ]);

    let cta: string;
    if (stage === 3) {
        cta = pick([
            `⏰ *Seu curso está chegando${daysToCourse > 0 ? ` — faltam ${daysToCourse} dias!` : '!'}* Para garantir seu acesso à turma, complete o pagamento até o dia do curso. Responda esta mensagem que resolvemos juntos agora — aceitamos Pix, cartão e parcelamento. 🤝`,
            `⏰ ${daysToCourse > 0 ? `Faltam só ${daysToCourse} dias para o curso!` : 'O curso é daqui a pouco!'} Me responde por aqui que te passo o Pix ou o link do cartão agora mesmo, rapidinho. 🤝`,
            `⏰ A turma já está sendo fechada${daysToCourse > 0 ? ` (curso em ${daysToCourse} dias)` : ''}. Quita comigo por aqui — Pix, cartão ou parcelado — e chega no dia só com a bagagem. 💪`
        ]);
    } else if (stage === 2) {
        cta = pick([
            `Quitando agora você chega no dia do curso com tudo resolvido. Posso te mandar o Pix ou prefere cartão/parcelamento? É só responder aqui. 😊`,
            `Quer aproveitar e deixar isso resolvido hoje? Me fala se prefere Pix ou cartão que te mando tudo por aqui. 😉`,
            `Se quiser, parcelamos o restante no cartão. Me responde aqui que organizo pra você sem burocracia. 👍`
        ]);
    } else {
        cta = pick([
            `Quando quiser quitar, é só responder esta mensagem — te passamos as opções de pagamento (Pix, cartão ou parcelamento). Qualquer dúvida sobre o curso, estamos por aqui! 🛠️`,
            `Sem pressa: quando quiser acertar o restante, me chama por aqui que te passo Pix ou cartão. E qualquer dúvida sobre o curso, é só perguntar! 🛠️`,
            `Pode quitar quando for melhor pra você — é só responder aqui. Aproveito pra avisar que estamos à disposição pra qualquer dúvida sobre o treinamento. 🤝`
        ]);
    }

    return `${header}\n\n${saldo}\n\n${cta}`;
}

/**
 * Processa lembretes de saldo pendente devidos. `dryRun` apenas lista quem
 * receberia, sem enviar nada.
 */
export async function processBalanceReminders(limit = 30, dryRun = false): Promise<BalanceRunResult> {
    const supabase = getServiceClient();
    const result: BalanceRunResult = { scanned: 0, eligible: 0, emailsSent: 0, whatsappSent: 0, errors: 0, details: [] };

    // Kill switch
    const { data: cfgRow } = await supabase
        .from('SITE_Config')
        .select('value')
        .eq('key', 'saldo_reminders_enabled')
        .maybeSingle();
    if (cfgRow?.value === 'false') {
        return { ...result, skipped: 'saldo_reminders disabled' };
    }

    // Escopo da cobrança: 'auto' (padrão) cobra só inscrições do sistema;
    // 'all' cobra todas. Qualquer valor diferente de 'all' cai no padrão seguro.
    const { data: scopeRow } = await supabase
        .from('SITE_Config')
        .select('value')
        .eq('key', 'saldo_reminders_scope')
        .maybeSingle();
    const scope: 'auto' | 'all' = scopeRow?.value === 'all' ? 'all' : 'auto';
    result.scope = scope;

    let query = supabase
        .from('SITE_Enrollments')
        .select('id, student_name, student_email, student_phone, status, created_at, amount_paid, total_amount, currency, enrolled_by_name, course:SITE_Courses(id, title, date, city, state, currency, whatsapp_group_link)')
        .eq('status', 'Confirmed')
        .gt('total_amount', 0);

    // Em modo 'auto', exclui inscrições feitas manualmente por atendentes —
    // só passam as criadas pelo próprio sistema (enrolled_by_name = 'Automático').
    if (scope === 'auto') {
        query = query.eq('enrolled_by_name', SYSTEM_ENROLLED_MARKER);
    }

    const { data: enrollments, error } = await query;

    if (error) throw new Error(`Falha ao buscar inscrições: ${error.message}`);

    // Link oficial de WhatsApp para o CTA do e-mail
    const { data: waRow } = await supabase
        .from('SITE_Config')
        .select('value')
        .eq('key', 'whatsapp_phone')
        .maybeSingle();
    const officialPhone = (waRow?.value || '').replace(/\D/g, '');

    const now = new Date();
    const today = new Date(now.toISOString().slice(0, 10));
    let waSentThisRun = 0;

    for (const enr of (enrollments || []) as any[]) {
        result.scanned++;
        if (result.details.length >= limit) break;

        const paid = Number(enr.amount_paid || 0);
        const total = Number(enr.total_amount || 0);
        const remaining = total - paid;
        if (remaining <= 0) continue;

        const course = enr.course;
        if (!course?.date) continue;
        const courseDate = new Date(String(course.date).slice(0, 10));
        if (courseDate < today) continue; // curso já aconteceu — não cobrar

        const stage = dueStage(new Date(enr.created_at), courseDate, now);
        if (stage === 0) continue;

        result.eligible++;

        const emailType = `saldo_lembrete_${stage}`;
        const waType = `saldo_lembrete_${stage}_wa`;
        const hasEmail = !!enr.student_email;
        const hasPhone = !!enr.student_phone;

        const emailDue = hasEmail && !(await alreadySent(enr.id, emailType));
        const waDue = hasPhone && !(await alreadySent(enr.id, waType));
        if (!emailDue && !waDue) continue;

        const cur = (course.currency || enr.currency || 'BRL').toUpperCase();
        const symbol = cur === 'EUR' ? '€' : cur === 'USD' ? '$' : 'R$';
        const firstName = (enr.student_name || '').split(' ')[0] || 'Aluno';
        const courseDateStr = fmtDate(course.date);
        const location = [course.city, course.state].filter(Boolean).join(', ') || 'A definir';
        const daysToCourse = daysBetween(now, courseDate);
        const waCtaText = `Olá! Quero quitar o saldo da minha inscrição no curso ${course.title}.`;
        const whatsappLink = officialPhone
            ? `https://wa.me/${officialPhone.length <= 11 ? '55' + officialPhone : officialPhone}?text=${encodeURIComponent(waCtaText)}`
            : '#';

        if (dryRun) {
            result.details.push({
                enrollmentId: enr.id,
                student: `${enr.student_name} (${symbol} ${fmtMoney(remaining)} restante)`,
                stage,
                email: emailDue ? `enviaria para ${enr.student_email}` : 'já enviado/sem e-mail',
                whatsapp: waDue ? `enviaria para ${enr.student_phone}` : 'já enviado/sem telefone'
            });
            continue;
        }

        let emailStatus = 'pulado';
        let waStatus = 'pulado';

        // ── Canal 1: e-mail ──────────────────────────────────────────────
        if (emailDue) {
            try {
                const sent = await sendTemplate(
                    enr.student_email,
                    'saldo_pendente',
                    {
                        studentName: firstName,
                        courseTitle: course.title || 'Curso W-Tech',
                        courseDate: courseDateStr,
                        courseLocation: location,
                        amountPaid: fmtMoney(paid),
                        totalAmount: fmtMoney(total),
                        remainingBalance: fmtMoney(remaining),
                        currencySymbol: symbol,
                        whatsappLink,
                        stage,
                        daysToCourse: stage === 3 ? String(Math.max(0, daysToCourse)) : ''
                    },
                    { type: emailType, enrollmentId: enr.id }
                );
                emailStatus = sent.sent ? 'enviado' : sent.skipped || sent.error || 'falhou';
                if (sent.sent) result.emailsSent++;
            } catch (e: any) {
                emailStatus = `erro: ${e?.message}`;
                result.errors++;
            }
        }

        // ── Canal 2: WhatsApp (com teto por execução e ritmo humano) ────
        if (waDue && waSentThisRun >= MAX_WA_SENDS_PER_RUN) {
            waStatus = 'adiado (teto diário anti-bloqueio)';
        } else if (waDue) {
            try {
                // Intervalo aleatório entre envios — nunca metralhar a fila
                if (waSentThisRun > 0) {
                    await sleep(randomBetween(WA_DELAY_MIN_MS, WA_DELAY_MAX_MS));
                }
                const message = buildWhatsAppMessage({
                    firstName,
                    courseTitle: course.title || 'Curso W-Tech',
                    courseDate: courseDateStr,
                    remaining: fmtMoney(remaining),
                    paid: fmtMoney(paid),
                    total: fmtMoney(total),
                    symbol,
                    stage,
                    daysToCourse
                });
                const sent = await sendWhatsAppText(enr.student_phone, message);
                waStatus = sent.sent ? 'enviado' : sent.skipped || sent.error || 'falhou';
                if (sent.sent) {
                    result.whatsappSent++;
                    waSentThisRun++;
                    await logWhatsApp(supabase, enr.id, waType, enr.student_email || enr.student_phone, 'Sent');
                } else if (sent.error) {
                    result.errors++;
                    await logWhatsApp(supabase, enr.id, waType, enr.student_email || enr.student_phone, 'Failed', sent.error);
                }
                // skipped (não configurado) → não loga, para reenviar quando configurar
            } catch (e: any) {
                waStatus = `erro: ${e?.message}`;
                result.errors++;
            }
        }

        result.details.push({
            enrollmentId: enr.id,
            student: `${enr.student_name} (${symbol} ${fmtMoney(remaining)} restante)`,
            stage,
            email: emailStatus,
            whatsapp: waStatus
        });
    }

    return result;
}
