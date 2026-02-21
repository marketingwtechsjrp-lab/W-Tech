import { generateContent } from "../../../lib/ai";

/**
 * Serviço de Inteligência para análise de dados e geração de relatórios estratégicos.
 */
export class IntelligenceAIService {
    /**
     * Gera um resumo executivo baseado em dados consolidados do sistema.
     */
    async generateExecutiveSummary(data: any): Promise<string> {
        const prompt = `
            Você é o 'W-Intelligence', um consultor sênior de BI exclusivo da W-TECH Brasil.
            Sua tarefa é analisar os seguintes dados de desempenho da empresa e fornecer um relatório executivo LUXO (premium, direto, elegante e estratégico) em Português Brasileiro.

            DADOS CONSOLIDADOS:
            ${JSON.stringify(data, null, 2)}

            REGRAS DE RESPOSTA:
            1. Use um tom executivo, motivador e extremamente profissional.
            2. Destaque 3 pontos positivos (Ouro).
            3. Destaque 2 pontos de melhoria urgente (Gargalos).
            4. Forneça uma 'Dica de Mestre' (estratégica) para os sócios.
            5. Formate usando Markdown elegante (use emojis discretos).
            6. Seja conciso (máximo 300 palavras).
        `;

        try {
            return await generateContent(prompt);
        } catch (error: any) {
            console.error("AI Generation Error:", error);
            const msg = error.message || "";
            if (msg.includes("Key")) return "Erro: Chave de API não configurada ou inválida. Verifique em Configurações > IA.";
            return "Falha ao processar análise inteligente. Verifique sua conexão ou tente novamente.";
        }
    }

    /**
     * Analisa a performance de um atendente específico.
     */
    async analyzeAttendantPerformance(attendantName: string, leads: any[], tasks: any[]): Promise<string> {
        const prompt = `
            Analise o desempenho de atendimento de: ${attendantName}.
            
            Leads sob gestão: ${JSON.stringify(leads)}
            Tarefas pendentes/concluídas: ${JSON.stringify(tasks)}

            Forneça um resumo de:
            - Habilidades dominantes (ex: rapidez, persistência).
            - Dificuldades aparentes (ex: demora no fechamento).
            - Plano de ação curto para este colaborador.
            
            Saída em Português Brasileiro, tom de coaching executivo.
        `;

        try {
            return await generateContent(prompt);
        } catch (error) {
            console.error("AI Generation Error:", error);
            return "Falha ao processar análise inteligente.";
        }
    }

    /**
     * Analisa o desempenho consolidado de toda a equipe.
     */
    async analyzeTeamPerformance(teamSummary: any[]): Promise<string> {
        const prompt = `
            Você é um Consultor de Gestão e Liderança sênior.
            Analise o desempenho consolidado da equipe de consultores da W-TECH:
            
            DADOS DA EQUIPE:
            ${JSON.stringify(teamSummary, null, 2)}

            Forneça um relatório de gestão contendo:
            1. Clima de Vendas (Baseado no volume de leads/tarefas).
            2. Destaque Coletivo (Quem está performando melhor e por que).
            3. Gargalos da Equipe (Onde todos estão travando).
            4. Recomendações de Treinamento ou Ajuste de Processo.

            Saída em Português Brasileiro, tom profissional de alta gestão.
        `;

        try {
            return await generateContent(prompt);
        } catch (error: any) {
            console.error("AI Generation Error:", error);
            return "Falha ao processar análise da equipe.";
        }
    }
}
