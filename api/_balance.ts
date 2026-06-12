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
 */

const STAGE_1_MIN_DAYS_ENROLLED = 2;
const STAGE_2_MIN_DAYS_ENROLLED = 9;
const STAGE_3_MAX_DAYS_TO_COURSE = 7;

export interface BalanceRunResult {
    scanned: number;
    eligible: number;
    emailsSent: number;
    whatsappSent: number;
    errors: number;
    skipped?: string;
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
    const header = `Olá, ${firstName}! Aqui é da equipe W-Tech Brasil 👋`;
    const saldo = `Sua vaga no curso *${courseTitle}* (${courseDate}) está confirmada, e consta um saldo em aberto na inscrição:\n\n✅ Pago: ${symbol} ${paid}\n💰 Total: ${symbol} ${total}\n⏳ *Restante: ${symbol} ${remaining}*`;

    if (stage === 3) {
        return `${header}\n\n⏰ *Seu curso está chegando${daysToCourse > 0 ? ` — faltam ${daysToCourse} dias!` : '!'}*\n\n${saldo}\n\nPara garantir seu acesso à turma, complete o pagamento até o dia do curso. Responda esta mensagem que resolvemos juntos agora — aceitamos Pix, cartão e parcelamento. 🤝`;
    }
    if (stage === 2) {
        return `${header}\n\n${saldo}\n\nQuitando agora você chega no dia do curso com tudo resolvido. Posso te mandar o Pix ou prefere cartão/parcelamento? É só responder aqui. 😊`;
    }
    return `${header}\n\n${saldo}\n\nQuando quiser quitar, é só responder esta mensagem — te passamos as opções de pagamento (Pix, cartão ou parcelamento). Qualquer dúvida sobre o curso, estamos por aqui! 🛠️`;
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

    const { data: enrollments, error } = await supabase
        .from('SITE_Enrollments')
        .select('id, student_name, student_email, student_phone, status, created_at, amount_paid, total_amount, currency, course:SITE_Courses(id, title, date, city, state, currency, whatsapp_group_link)')
        .eq('status', 'Confirmed')
        .gt('total_amount', 0);

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

        // ── Canal 2: WhatsApp ────────────────────────────────────────────
        if (waDue) {
            try {
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
