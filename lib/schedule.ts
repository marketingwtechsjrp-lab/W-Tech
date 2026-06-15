import { LandingPage } from '../types';

/** Um módulo do cronograma do curso (mesmo shape do campo scheduleModules da LandingPage). */
export type ScheduleModule = NonNullable<LandingPage['scheduleModules']>[number];

/**
 * Cronograma padrão da W-Tech (Curso de Suspensão On-Road e Off-Road),
 * estruturado por módulo. Usado como padrão em TODAS as landing pages que
 * ainda não têm um cronograma próprio cadastrado.
 */
export const DEFAULT_SCHEDULE_MODULES: ScheduleModule[] = [
    {
        title: 'Fundamentos das Suspensões (Base Técnica)',
        objective: 'Fazer o aluno entender o que existe, por que existe e onde cada sistema é aplicado.',
        topics: [
            'O que é uma suspensão e seu papel na segurança, conforto e performance',
            'Diferença entre suspensão convencional, invertida e eletrônica',
            'Como cada tipo reage a impactos, irregularidades do solo e asfalto vs off-road',
            'Aplicações práticas em motos urbanas, trail, big trail e esportivas'
        ],
        result: 'O aluno entende qual suspensão está na moto e por que ela se comporta daquele jeito.'
    },
    {
        title: 'Molas, Cargas e Geometria da Suspensão',
        objective: 'Ensinar a base mecânica que define o comportamento da moto.',
        topics: [
            'Função real da mola dentro do conjunto de suspensão',
            'Conceitos de taxa da mola, compressão e afundamento (SAG estático e dinâmico)',
            'Como calcular o SAG corretamente',
            'Quando ajustar, substituir ou customizar molas',
            'Influência do peso do piloto, garupa e carga'
        ],
        result: 'O aluno sabe dimensionar corretamente a mola para cada tipo de moto e uso.'
    },
    {
        title: 'Mecânica dos Fluidos Aplicada à Suspensão',
        objective: 'Dominar o “coração hidráulico” da suspensão.',
        topics: [
            'O que é viscosidade e como ela afeta o funcionamento',
            'Fenômenos críticos: cavitação, espumação e perda de eficiência hidráulica',
            'Como o fluido se comporta sob pressão, em altas temperaturas e em ciclos repetitivos de impacto',
            'Relação entre fluido, válvulas e estabilidade da moto'
        ],
        result: 'O aluno entende por que a suspensão falha, endurece ou perde resposta.'
    },
    {
        title: 'Ajustes e Configuração da Suspensão',
        objective: 'Ensinar o aluno a ajustar corretamente, sem achismo.',
        topics: [
            'Ajuste correto de pré-carga, retorno (rebound) e compressão (damping)',
            'Curso útil da suspensão',
            'Como cada ajuste interfere em conforto, aderência, estabilidade e desgaste',
            'Configurações ideais para uso urbano, viagem, trilha e pista'
        ],
        result: 'O aluno regula uma suspensão com critério técnico, não por tentativa e erro.'
    },
    {
        title: 'Seleção do Óleo e Viscosidade Ideal',
        objective: 'Evitar erros comuns que destroem o desempenho da suspensão.',
        topics: [
            'Diferença entre viscosidade nominal e viscosidade real (cSt)',
            'Como escolher o óleo correto pelo projeto da suspensão, componentes internos e temperatura',
            'Compatibilidade do fluido com retentores e vedações',
            'Problemas causados por escolha errada do óleo'
        ],
        result: 'O aluno nunca mais erra óleo de suspensão.'
    },
    {
        title: 'Otimização Avançada da Resposta da Suspensão',
        objective: 'Levar o aluno ao nível profissional.',
        topics: [
            'Funcionamento das válvulas de controle de fluxo',
            'Papel de shims, pistões e canais hidráulicos',
            'Como alterar o comportamento: mais conforto, mais esportividade, melhor leitura de terreno',
            'Ajustes finos para trilha pesada, asfalto de alta performance e uso misto'
        ],
        result: 'O aluno aprende a extrair o máximo da suspensão, adaptando-a ao piloto e ao uso.'
    }
];

/**
 * Resolve os módulos do cronograma exibidos numa LP de curso:
 * usa os módulos cadastrados na página; se não houver, cai no padrão da W-Tech
 * (garante cronograma visual em todas as páginas). Filtra módulos sem título.
 */
export function resolveScheduleModules(list?: ScheduleModule[] | null): ScheduleModule[] {
    const valid = (list || []).filter(m => m && m.title && m.title.trim());
    return valid.length > 0 ? valid : DEFAULT_SCHEDULE_MODULES;
}

/**
 * Achata os módulos estruturados no formato de texto com emojis usado nas
 * mensagens de WhatsApp e no campo legado course.schedule. Mantém o WhatsApp
 * e a página de detalhe do curso funcionando a partir da fonte única (módulos).
 */
export function scheduleModulesToText(modules?: ScheduleModule[] | null): string {
    const list = resolveScheduleModules(modules);
    const blocks = list.map((m, i) => {
        const lines: string[] = [`🔹 Módulo ${i + 1} – ${m.title}`];
        if (m.objective) lines.push(`Objetivo: ${m.objective}`);
        if (m.topics && m.topics.length) {
            lines.push('O aluno vai aprender:');
            for (const t of m.topics) if (t && t.trim()) lines.push(t.trim());
        }
        if (m.result) lines.push(`✅ Resultado: ${m.result}`);
        return lines.join('\n');
    });
    return `🛠️ Cronograma de Aprendizado\n\n${blocks.join('\n\n')}`;
}
