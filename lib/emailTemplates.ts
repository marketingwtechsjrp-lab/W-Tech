/**
 * Templates de e-mail (HTML versionado no repo) + interpolação de variáveis.
 *
 * Uso:
 *   const { subject, html } = renderTemplate('confirmacao_inscricao', vars)
 *
 * Sem dependências de DOM — roda no servidor (serverless) e no cliente.
 */

const BRAND = {
    gold: '#D4AF37',
    black: '#111111',
    bg: '#FDFCFB',
    text: '#333333',
    muted: '#777777',
    border: '#ECECEC'
};

/** Escapa HTML em valores interpolados para evitar injeção. */
function esc(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Substitui {{chave}} pelos valores (escapados). {{{chave}}} insere HTML cru. */
function interpolate(tpl: string, vars: Record<string, unknown>): string {
    return tpl
        .replace(/\{\{\{(\w+)\}\}\}/g, (_, k) => String(vars[k] ?? ''))
        .replace(/\{\{(\w+)\}\}/g, (_, k) => esc(vars[k]));
}

/** Layout base reutilizável (cabeçalho dourado, corpo, rodapé). */
function baseLayout(opts: { title: string; bodyHtml: string; preheader?: string }): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Arial,Helvetica,sans-serif;color:${BRAND.text};">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
      <tr><td style="height:6px;background:${BRAND.gold};"></td></tr>
      <tr><td style="padding:32px 32px 8px 32px;text-align:center;">
        <div style="font-size:13px;font-weight:bold;letter-spacing:3px;color:${BRAND.black};text-transform:uppercase;">W-TECH BRASIL</div>
      </td></tr>
      <tr><td style="padding:8px 32px 32px 32px;">
        ${opts.bodyHtml}
      </td></tr>
      <tr><td style="padding:20px 32px;background:#FAFAFA;border-top:1px solid ${BRAND.border};text-align:center;">
        <p style="margin:0;font-size:11px;color:${BRAND.muted};">W-Tech Brasil · Autoridade em Suspensões Off-Road</p>
        <p style="margin:4px 0 0;font-size:11px;color:${BRAND.muted};">Dúvidas? Responda este e-mail ou fale com nosso suporte.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

const btn = (href: string, label: string) =>
    `<a href="${esc(href)}" style="display:inline-block;background:${BRAND.black};color:#fff;text-decoration:none;font-weight:bold;font-size:13px;padding:12px 22px;border-radius:10px;">${esc(label)}</a>`;

const row = (label: string, value: string) =>
    `<tr>
       <td style="padding:6px 0;font-size:11px;color:${BRAND.muted};text-transform:uppercase;font-weight:bold;width:38%;vertical-align:top;">${esc(label)}</td>
       <td style="padding:6px 0;font-size:14px;color:${BRAND.text};font-weight:bold;">${value}</td>
     </tr>`;

export interface RenderedEmail {
    subject: string;
    html: string;
}

/**
 * Template: confirmação de inscrição (transacional).
 * Variáveis esperadas:
 *   studentName, courseTitle, courseDate, courseLocation,
 *   amountPaid, totalAmount, remainingBalance, currencySymbol,
 *   clientCode (opcional), portalUrl (opcional),
 *   whatsappGroupLink (opcional), whatToBring (opcional)
 */
function confirmacaoInscricao(vars: Record<string, unknown>): RenderedEmail {
    const hasBalance = vars.showBalance === true;
    const cur = esc(vars.currencySymbol || 'R$');

    const body = `
    <div style="text-align:center;margin-bottom:8px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;border-radius:50%;background:#E9F9EE;color:#22A45D;font-size:34px;">✓</div>
    </div>
    <h1 style="margin:8px 0 2px;text-align:center;font-size:24px;color:${BRAND.black};text-transform:uppercase;">Inscrição Confirmada!</h1>
    <p style="margin:0 0 24px;text-align:center;font-size:12px;font-weight:bold;letter-spacing:2px;color:${BRAND.gold};text-transform:uppercase;">Parabéns, {{studentName}}!</p>

    <div style="background:#FAFAFA;border:1px solid ${BRAND.border};border-radius:14px;padding:18px 20px;margin-bottom:18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row('Curso', '{{courseTitle}}')}
        ${row('Data', '{{courseDate}}')}
        ${row('Local', '{{courseLocation}}')}
        ${row('Valor Pago', `${cur} {{amountPaid}}`)}
        ${hasBalance ? row('Saldo Restante', `<span style="color:#C98A00;">${cur} {{remainingBalance}}</span>`) : ''}
      </table>
    </div>

    {{{accessBlock}}}
    {{{whatsappBlock}}}

    <div style="background:#EEF4FF;border:1px solid #DCE7FB;border-radius:14px;padding:16px 20px;margin-bottom:18px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:bold;letter-spacing:1px;color:#2563EB;text-transform:uppercase;">Próximos Passos</p>
      <p style="margin:0 0 6px;font-size:13px;">📧 Guarde este e-mail como comprovante da sua inscrição.</p>
      <p style="margin:0 0 6px;font-size:13px;">👤 Nossa equipe entrará em contato com mais instruções.</p>
      {{{whatToBringLine}}}
    </div>
    `;

    // Blocos condicionais (HTML cru via {{{ }}})
    const accessBlock = vars.clientCode
        ? `<div style="background:#FFFCF2;border:1px solid #F0E2B6;border-radius:14px;padding:16px 20px;margin-bottom:18px;">
             <p style="margin:0 0 8px;font-size:11px;font-weight:bold;letter-spacing:1px;color:${BRAND.gold};text-transform:uppercase;">🔑 Código de Acesso do Aluno</p>
             <p style="margin:0 0 10px;font-family:monospace;font-size:20px;font-weight:bold;letter-spacing:2px;color:${BRAND.black};">${esc(vars.clientCode)}</p>
             ${vars.portalUrl ? btn(String(vars.portalUrl), 'Entrar no Portal do Aluno') : ''}
           </div>`
        : '';

    const whatsappBlock = vars.whatsappGroupLink
        ? `<div style="text-align:center;margin-bottom:18px;">
             ${btn(String(vars.whatsappGroupLink), '💬 Entrar no Grupo VIP do WhatsApp')}
             <p style="margin:8px 0 0;font-size:11px;color:${BRAND.muted};">Grupo da turma para avisos e materiais extras.</p>
           </div>`
        : '';

    const whatToBringLine = vars.whatToBring
        ? `<p style="margin:0;font-size:13px;">✅ O que trazer: ${esc(vars.whatToBring)}</p>`
        : '';

    const merged = { ...vars, accessBlock, whatsappBlock, whatToBringLine };
    return {
        subject: `Inscrição confirmada — ${esc(vars.courseTitle || 'Curso W-Tech')}`,
        html: interpolate(baseLayout({ title: 'Inscrição Confirmada', preheader: `Sua vaga em ${esc(vars.courseTitle)} está confirmada!`, bodyHtml: body }), merged)
    };
}

/**
 * Template: lembrete de saldo pendente da inscrição (cobrança amigável).
 * Variáveis esperadas:
 *   studentName, courseTitle, courseDate, courseLocation,
 *   amountPaid, totalAmount, remainingBalance, currencySymbol,
 *   whatsappLink, stage (1|2|3 — muda assunto e tom),
 *   daysToCourse (opcional, usado no stage 3)
 */
function saldoPendente(vars: Record<string, unknown>): RenderedEmail {
    const cur = esc(vars.currencySymbol || 'R$');
    const stage = Number(vars.stage || 1);

    const subjects: Record<number, string> = {
        1: `Sua vaga está garantida — falta só completar a inscrição 🤝`,
        2: `${esc(vars.studentName || '')}, falta pouco para quitar sua inscrição`,
        3: `⏰ Seu curso está chegando — complete sua inscrição`
    };

    const intro: Record<number, string> = {
        1: `Sua reserva no curso está confirmada! Para deixar tudo pronto, falta apenas o saldo restante da inscrição. Você pode quitar quando preferir — nossa equipe te ajuda com as opções de pagamento.`,
        2: `Passando para lembrar que sua inscrição ainda tem um saldo em aberto. Quitando agora, você garante sua vaga sem preocupação e chega no dia do curso com tudo resolvido.`,
        3: `Seu curso está chegando${vars.daysToCourse ? ` (faltam ${esc(vars.daysToCourse)} dias!)` : ''} e identificamos que ainda há um saldo em aberto na sua inscrição. Complete o pagamento para garantir seu acesso à turma.`
    };

    const body = `
    <h1 style="margin:8px 0 2px;text-align:center;font-size:22px;color:${BRAND.black};text-transform:uppercase;">Complete sua Inscrição</h1>
    <p style="margin:0 0 20px;text-align:center;font-size:12px;font-weight:bold;letter-spacing:2px;color:${BRAND.gold};text-transform:uppercase;">Olá, {{studentName}}!</p>

    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;">${intro[stage] || intro[1]}</p>

    <div style="background:#FAFAFA;border:1px solid ${BRAND.border};border-radius:14px;padding:18px 20px;margin-bottom:18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row('Curso', '{{courseTitle}}')}
        ${row('Data', '{{courseDate}}')}
        ${row('Local', '{{courseLocation}}')}
        ${row('Valor Total', `${cur} {{totalAmount}}`)}
        ${row('Já Pago', `<span style="color:#22A45D;">${cur} {{amountPaid}}</span>`)}
        ${row('Saldo Restante', `<span style="color:#C98A00;font-size:16px;">${cur} {{remainingBalance}}</span>`)}
      </table>
    </div>

    <div style="text-align:center;margin-bottom:18px;">
      ${btn(String(vars.whatsappLink || '#'), '💬 Quitar pelo WhatsApp')}
      <p style="margin:8px 0 0;font-size:11px;color:${BRAND.muted};">Fale com nossa equipe — Pix, cartão ou parcelamento.</p>
    </div>

    <p style="margin:0;font-size:12px;color:${BRAND.muted};text-align:center;">
      Já quitou? Desconsidere este e-mail — a baixa pode levar algumas horas.
    </p>
    `;

    return {
        subject: subjects[stage] || subjects[1],
        html: interpolate(
            baseLayout({
                title: 'Complete sua Inscrição',
                preheader: `Saldo restante de ${cur} ${esc(vars.remainingBalance)} — ${esc(vars.courseTitle)}`,
                bodyHtml: body
            }),
            vars
        )
    };
}

/** Template genérico de teste. */
function teste(vars: Record<string, unknown>): RenderedEmail {
    const body = `
      <h1 style="text-align:center;font-size:22px;color:${BRAND.black};">Teste de E-mail ✅</h1>
      <p style="text-align:center;font-size:14px;color:${BRAND.text};">
        Se você está lendo isto, a integração com o <strong>Brevo</strong> está funcionando.
      </p>
      <p style="text-align:center;font-size:12px;color:${BRAND.muted};">Enviado em {{sentAt}}</p>`;
    return {
        subject: 'Teste de e-mail — W-Tech Brasil',
        html: interpolate(baseLayout({ title: 'Teste de E-mail', bodyHtml: body }), vars)
    };
}

const TEMPLATES: Record<string, (vars: Record<string, unknown>) => RenderedEmail> = {
    confirmacao_inscricao: confirmacaoInscricao,
    saldo_pendente: saldoPendente,
    teste
};

/** Renderiza um template pelo nome. Lança se não existir. */
export function renderTemplate(name: string, vars: Record<string, unknown> = {}): RenderedEmail {
    const fn = TEMPLATES[name];
    if (!fn) throw new Error(`Template de e-mail desconhecido: ${name}`);
    return fn(vars);
}

/**
 * Renderiza um e-mail a partir de assunto + corpo HTML arbitrário (ex.: corpo
 * autorado no editor de fluxos), interpolando variáveis ({{nome}}) e
 * envelopando o corpo na identidade W-Tech. Usado pelo motor de follow-up.
 */
export function renderRawEmail(subject: string, bodyHtml: string, vars: Record<string, unknown> = {}): RenderedEmail {
    const interpolatedSubject = interpolate(subject || '', vars);
    // body do editor pode conter HTML; tratamos como HTML cru e só trocamos variáveis
    const interpolatedBody = bodyHtml.replace(/\{\{(\w+)\}\}/g, (_, k) => esc(vars[k]));
    return {
        subject: interpolatedSubject,
        html: baseLayout({ title: interpolatedSubject || 'W-Tech Brasil', bodyHtml: interpolatedBody })
    };
}
