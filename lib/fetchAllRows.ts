/**
 * Leitura paginada do PostgREST.
 *
 * O Supabase corta toda resposta em 1000 linhas (`db-max-rows`) e NÃO avisa: a query
 * volta com sucesso, só que incompleta. Um `select('*')` numa tabela com 1152 linhas
 * devolve 1000 e as outras 152 simplesmente não aparecem na tela — foi assim que
 * leads antigos "sumiram" do CRM depois que a base passou de mil registros.
 *
 * Use sempre que a tabela puder crescer além de mil linhas (leads, matrículas, logs).
 */
const TAMANHO_PAGINA = 1000;

interface RespostaPostgrest<T> {
    data: T[] | null;
    error: { message: string } | null;
}

/**
 * @param montarQuery recebe o intervalo e devolve a query já com `.range(de, ate)`.
 *                    Precisa ter ordenação determinística, senão as páginas repetem
 *                    ou pulam linhas.
 */
export async function fetchAllRows<T>(
    montarQuery: (de: number, ate: number) => PromiseLike<RespostaPostgrest<T>>,
): Promise<{ data: T[]; error: { message: string } | null }> {
    const todas: T[] = [];

    for (let de = 0; ; de += TAMANHO_PAGINA) {
        const { data, error } = await montarQuery(de, de + TAMANHO_PAGINA - 1);

        // Devolve o que já veio junto com o erro: meia lista é melhor que lista vazia,
        // e quem chama decide se avisa o usuário.
        if (error) return { data: todas, error };

        todas.push(...(data ?? []));
        if (!data || data.length < TAMANHO_PAGINA) break;
    }

    return { data: todas, error: null };
}
