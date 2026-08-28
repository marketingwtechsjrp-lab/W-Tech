/**
 * Identificação canônica de um lead no CRM (SITE_Leads).
 *
 * Motivo: cada origem grava contato num formato diferente — o CRM e as landing
 * pages salvam telefone/e-mail crus ("(11) 99999-8888", "FULANO@GMAIL.COM"),
 * os checkouts salvam normalizados ("11999998888", "fulano@gmail.com"). Buscas
 * com match exato (.eq) erram nesses casos e o chamador acaba INSERINDO uma
 * ficha nova para alguém que já existe. Foi assim que 13% das matrículas
 * geraram lead duplicado e alunos já matriculados reapareceram em "Novos".
 *
 * Regra única: e-mail comparado sem diferenciar maiúsculas; telefone comparado
 * pelos últimos 8 dígitos (ignora DDI, 9º dígito e máscara).
 */

/** Status que significam "negócio ganho" — nunca podem ser rebaixados por código. */
export const WON_STATUSES = ['Converted', 'Matriculated'];

export function isWonStatus(status?: string | null): boolean {
    return !!status && WON_STATUSES.includes(status);
}

export function normalizeEmail(email?: string | null): string | null {
    const value = (email || '').trim().toLowerCase();
    return value.includes('@') ? value : null;
}

/** Últimos 8 dígitos do telefone, ou null se não houver dígitos suficientes. */
export function phoneLast8(phone?: string | null): string | null {
    const digits = (phone || '').replace(/\D/g, '');
    return digits.length >= 8 ? digits.slice(-8) : null;
}

/**
 * Escapa os curingas de LIKE. Sem isso, o "_" comum em e-mails
 * (andre_12@x.com) vira curinga de 1 caractere e casa com a pessoa errada.
 */
function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, match => `\\${match}`);
}

export interface LeadContact {
    email?: string | null;
    phone?: string | null;
}

/**
 * Procura a ficha existente da pessoa. Havendo mais de uma (duplicatas antigas
 * já no banco), devolve a ganha — assim um recadastro atualiza a ficha certa em
 * vez de criar mais uma. Retorna null se ninguém casar.
 *
 * `supabase` é injetado para servir tanto o browser (lib/) quanto as funções
 * serverless (api/), que usam clientes diferentes.
 */
export async function findExistingLead<T = any>(
    supabase: any,
    contact: LeadContact
): Promise<T | null> {
    const email = normalizeEmail(contact.email);
    const last8 = phoneLast8(contact.phone);
    const found: any[] = [];

    if (email) {
        const { data } = await supabase
            .from('SITE_Leads')
            .select('*')
            .ilike('email', escapeLike(email))
            .limit(5);
        if (data?.length) found.push(...data);
    }

    if (last8) {
        // A coluna guarda o telefone CRU ("35 99893 1172", "+351 962 030 640"),
        // então um ILIKE '%98931172%' não casa quando há separador no meio.
        // O padrão intercalado com % tolera qualquer separador; a conferência
        // final é feita em JS comparando os 8 dígitos exatos, para não aceitar
        // um número diferente que por acaso contenha esses dígitos em ordem.
        const loosePattern = `%${last8.split('').join('%')}%`;
        const { data } = await supabase
            .from('SITE_Leads')
            .select('*')
            .ilike('phone', loosePattern)
            .limit(20);
        const confirmed = (data || []).filter((lead: any) => phoneLast8(lead.phone) === last8);
        if (confirmed.length) found.push(...confirmed);
    }

    if (found.length === 0) return null;

    // Deduplica o resultado das duas buscas e prioriza a ficha ganha; empatando,
    // a mais recente.
    const unique = Array.from(new Map(found.map(lead => [lead.id, lead])).values());
    unique.sort((a, b) => {
        const wonDiff = Number(isWonStatus(b.status)) - Number(isWonStatus(a.status));
        if (wonDiff !== 0) return wonDiff;
        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });

    return unique[0] as T;
}

/**
 * Decide o status a gravar num lead existente, sem nunca rebaixar um ganho.
 * Use em TODO ponto que "reseta" status (recadastro em LP, abertura de
 * checkout, recuperação de carrinho).
 */
export function preserveWonStatus(
    currentStatus: string | null | undefined,
    desiredStatus: string
): string {
    if (isWonStatus(currentStatus) && !isWonStatus(desiredStatus)) {
        return currentStatus as string;
    }
    return desiredStatus;
}
