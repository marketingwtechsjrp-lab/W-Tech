/**
 * Tabela de molas por modelo (SITE_SpringRecommendations) para as páginas
 * /molas/<modelo>. A calculadora de /molas só mostra a mola depois de escolher
 * modelo e peso, então robô de busca e de IA nunca via o dado: cada modelo passa
 * a ter uma página com a tabela inteira em HTML.
 */

/** Linha crua de SITE_SpringRecommendations. */
export type LinhaMola = {
  brand: string;
  model: string;
  part_type: string;
  weight_range: string | null;
  spring_code: string | null;
  standard_code: string | null;
};

/** Mola do catálogo: código como está no banco e taxa em N/mm, quando o código traz. */
export type Mola = { codigo: string; taxa: number | null };

export type FaixaDePeso = {
  rotulo: string;
  min: number;
  max: number;
  bengala: Mola | null;
  amortecedor: Mola | null;
};

export type TabelaDeMolas = {
  faixas: FaixaDePeso[];
  fabricaBengala: Mola | null;
  fabricaAmortecedor: Mola | null;
  /** Faixas de peso em que a mola recomendada é a própria mola de fábrica. */
  faixasDeFabricaBengala: string[];
  faixasDeFabricaAmortecedor: string[];
};

/**
 * Endereço do modelo. Tem de bater com a coluna gerada `model_slug`
 * (migrations/2026-09-29_molas_por_modelo.sql), que usa a mesma regra em SQL.
 */
export function slugDoModelo(marca: string, modelo: string): string {
  return `${marca} ${modelo}`.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase().replace(/^-+|-+$/g, '');
}

/** "WP 43,2-505-4,8N" → taxa 4,8 N/mm. "N/A" e código vazio não são mola. */
export function lerMola(codigo: string | null | undefined): Mola | null {
  const texto = (codigo || '').trim();
  if (!texto || /^n\/?a$/i.test(texto)) return null;
  const taxa = texto.match(/(\d+(?:[.,]\d+)?)\s*N\s*$/i);
  return {
    codigo: texto.replace(/\s+N$/i, 'N'),
    taxa: taxa ? Number(taxa[1].replace(',', '.')) : null,
  };
}

/** "75-85kg" → { min: 75, max: 85 }. */
export function lerFaixa(rotulo: string | null | undefined): { min: number; max: number } | null {
  const m = (rotulo || '').match(/(\d+)\s*-\s*(\d+)/);
  return m ? { min: Number(m[1]), max: Number(m[2]) } : null;
}

export function formatarTaxa(taxa: number | null): string {
  return taxa == null ? '—' : `${taxa.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} N/mm`;
}

const mesmaMola = (a: Mola | null, b: Mola | null) =>
  Boolean(a && b && (a.codigo === b.codigo || (a.taxa != null && a.taxa === b.taxa && a.codigo.split('-')[0] === b.codigo.split('-')[0])));

/**
 * Monta a tabela da página. Entram só as faixas com mola recomendada (as faixas
 * de 5 kg sem código, nas motos de adulto, trazem apenas a mola de fábrica).
 */
export function montarTabela(linhas: LinhaMola[]): TabelaDeMolas {
  const porFaixa = new Map<string, FaixaDePeso>();
  let fabricaBengala: Mola | null = null;
  let fabricaAmortecedor: Mola | null = null;

  for (const linha of linhas) {
    const dianteira = linha.part_type === 'Front';
    const traseira = linha.part_type === 'Rear';
    if (!dianteira && !traseira) continue;

    const fabrica = lerMola(linha.standard_code);
    if (fabrica && dianteira && !fabricaBengala) fabricaBengala = fabrica;
    if (fabrica && traseira && !fabricaAmortecedor) fabricaAmortecedor = fabrica;

    const mola = lerMola(linha.spring_code);
    const faixa = lerFaixa(linha.weight_range);
    if (!mola || mola.taxa == null || !faixa || !linha.weight_range) continue;

    const rotulo = `${faixa.min} a ${faixa.max} kg`;
    const atual = porFaixa.get(rotulo) || { rotulo, ...faixa, bengala: null, amortecedor: null };
    if (dianteira) atual.bengala = mola;
    else atual.amortecedor = mola;
    porFaixa.set(rotulo, atual);
  }

  const faixas = [...porFaixa.values()].sort((a, b) => a.min - b.min || a.max - b.max);
  return {
    faixas,
    fabricaBengala,
    fabricaAmortecedor,
    faixasDeFabricaBengala: faixas.filter((f) => mesmaMola(f.bengala, fabricaBengala)).map((f) => f.rotulo),
    faixasDeFabricaAmortecedor: faixas.filter((f) => mesmaMola(f.amortecedor, fabricaAmortecedor)).map((f) => f.rotulo),
  };
}

/** Faixa que contém o peso (em kg), ou `null` se o peso fica fora da tabela. */
export function faixaDoPeso(tabela: TabelaDeMolas, peso: number): FaixaDePeso | null {
  return tabela.faixas.find((f) => peso >= f.min && peso < f.max) || null;
}
