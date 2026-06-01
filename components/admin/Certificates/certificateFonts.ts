// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de fontes dos certificados / crachás.
//
// Dois tipos:
//  • NATIVAS do jsPDF (helvetica/times/courier) — sem download, bold+itálico reais.
//  • EMBUTIDAS — TTFs em /public/fonts/certificates servidos localmente. São
//    registradas no jsPDF na hora de gerar (addFileToVFS + addFont) e exibidas no
//    preview via @font-face. Assim o preview no editor = o PDF final.
//
// Para adicionar uma nova fonte: baixe o .ttf em public/fonts/certificates/ e
// acrescente uma entrada em FONTS abaixo. Nada mais precisa mudar.
// ─────────────────────────────────────────────────────────────────────────────

export type FontStyleKey = 'normal' | 'bold' | 'italic' | 'bolditalic';

export interface CertFont {
    key: string;                 // valor salvo em el.fontFamily
    label: string;               // texto no seletor
    group: 'Padrão' | 'Serifadas' | 'Assinatura';
    kind: 'native' | 'embedded';
    /** Família CSS usada no preview do editor. */
    css: string;
    /** native: família jsPDF. */
    pdfFamily?: 'helvetica' | 'times' | 'courier';
    /** embedded: arquivo .ttf por estilo (sem extensão), em /fonts/certificates/. */
    files?: Partial<Record<FontStyleKey, string>>;
    supportsBold?: boolean;
    supportsItalic?: boolean;
}

const FONT_DIR = '/fonts/certificates';

export const FONTS: CertFont[] = [
    // ── Nativas (jsPDF) ──
    { key: 'helvetica', label: 'Helvetica · Sans-serif', group: 'Padrão', kind: 'native', pdfFamily: 'helvetica', css: 'Helvetica, Arial, sans-serif', supportsBold: true, supportsItalic: true },
    { key: 'times', label: 'Times · Serifada', group: 'Padrão', kind: 'native', pdfFamily: 'times', css: '"Times New Roman", Times, serif', supportsBold: true, supportsItalic: true },
    { key: 'courier', label: 'Courier · Monoespaçada', group: 'Padrão', kind: 'native', pdfFamily: 'courier', css: '"Courier New", Courier, monospace', supportsBold: true, supportsItalic: true },

    // ── Serifada clássica embutida (com negrito real) ──
    {
        key: 'oldstandard', label: 'Old Standard · Serifada elegante', group: 'Serifadas', kind: 'embedded',
        css: `'Cert_oldstandard', "Times New Roman", serif`,
        files: { normal: 'oldstandard-regular', bold: 'oldstandard-bold' },
        supportsBold: true, supportsItalic: false,
    },

    // ── Assinatura / script (peso único) ──
    { key: 'greatvibes', label: 'Great Vibes · Assinatura', group: 'Assinatura', kind: 'embedded', css: `'Cert_greatvibes', cursive`, files: { normal: 'greatvibes-regular' } },
    { key: 'allura', label: 'Allura · Assinatura fina', group: 'Assinatura', kind: 'embedded', css: `'Cert_allura', cursive`, files: { normal: 'allura-regular' } },
    { key: 'sacramento', label: 'Sacramento · Manuscrita', group: 'Assinatura', kind: 'embedded', css: `'Cert_sacramento', cursive`, files: { normal: 'sacramento-regular' } },
    { key: 'pinyonscript', label: 'Pinyon Script · Caligrafia', group: 'Assinatura', kind: 'embedded', css: `'Cert_pinyonscript', cursive`, files: { normal: 'pinyonscript-regular' } },
    { key: 'parisienne', label: 'Parisienne · Romântica', group: 'Assinatura', kind: 'embedded', css: `'Cert_parisienne', cursive`, files: { normal: 'parisienne-regular' } },
];

/** Mapa rápido key → fonte (com normalização de legados). */
export function getFontDef(family?: string): CertFont {
    const f = (family || '').toLowerCase();
    const exact = FONTS.find(o => o.key === f);
    if (exact) return exact;
    // legados / aliases
    if (f.includes('times') || (f.includes('serif') && !f.includes('sans'))) return FONTS.find(o => o.key === 'times')!;
    if (f.includes('courier') || f.includes('mono')) return FONTS.find(o => o.key === 'courier')!;
    return FONTS[0]; // helvetica / "Arial" / vazio
}

/** font-family CSS para o preview. */
export const toCssFont = (family?: string): string => getFontDef(family).css;

export const fontSupportsBold = (family?: string): boolean => !!getFontDef(family).supportsBold;
export const fontSupportsItalic = (family?: string): boolean => !!getFontDef(family).supportsItalic;

/** Combina negrito + itálico no formato do jsPDF. */
export function toJsPdfStyle(fontWeight?: string, fontStyle?: string): FontStyleKey {
    const bold = fontWeight === 'bold';
    const italic = fontStyle === 'italic';
    if (bold && italic) return 'bolditalic';
    if (bold) return 'bold';
    if (italic) return 'italic';
    return 'normal';
}

/** Compat: família jsPDF nativa (usada só por fontes nativas). */
export function toJsPdfFamily(family?: string): 'helvetica' | 'times' | 'courier' {
    return getFontDef(family).pdfFamily || 'helvetica';
}

// ── Preview: injeta @font-face das fontes embutidas (idempotente) ────────────
export function injectCertificateFontFaces(): void {
    if (typeof document === 'undefined') return;
    const id = 'cert-font-faces';
    if (document.getElementById(id)) return;
    const rules: string[] = [];
    for (const f of FONTS) {
        if (f.kind !== 'embedded' || !f.files) continue;
        const fam = f.css.match(/'([^']+)'/)?.[1];
        if (!fam) continue;
        if (f.files.normal) rules.push(`@font-face{font-family:'${fam}';src:url('${FONT_DIR}/${f.files.normal}.ttf') format('truetype');font-weight:400;font-style:normal;font-display:swap;}`);
        if (f.files.bold) rules.push(`@font-face{font-family:'${fam}';src:url('${FONT_DIR}/${f.files.bold}.ttf') format('truetype');font-weight:700;font-style:normal;font-display:swap;}`);
        if (f.files.italic) rules.push(`@font-face{font-family:'${fam}';src:url('${FONT_DIR}/${f.files.italic}.ttf') format('truetype');font-weight:400;font-style:italic;font-display:swap;}`);
    }
    const style = document.createElement('style');
    style.id = id;
    style.textContent = rules.join('\n');
    document.head.appendChild(style);
}

// ── PDF: registro das fontes embutidas no jsPDF sob demanda ──────────────────

const b64Cache = new Map<string, Promise<string>>();

function fetchFontBase64(fileKey: string): Promise<string> {
    if (b64Cache.has(fileKey)) return b64Cache.get(fileKey)!;
    const p = (async () => {
        const res = await fetch(`${FONT_DIR}/${fileKey}.ttf`);
        if (!res.ok) throw new Error(`Falha ao carregar fonte ${fileKey} (${res.status})`);
        const buf = new Uint8Array(await res.arrayBuffer());
        // base64 em chunks (evita estouro de pilha em arquivos grandes)
        let binary = '';
        const CHUNK = 0x8000;
        for (let i = 0; i < buf.length; i += CHUNK) {
            binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + CHUNK)) as any);
        }
        return btoa(binary);
    })();
    b64Cache.set(fileKey, p);
    return p;
}

/** Escolhe o melhor arquivo disponível para o estilo desejado (com degradê). */
function pickFile(def: CertFont, desired: FontStyleKey): string | undefined {
    const f = def.files;
    if (!f) return undefined;
    const order: Record<FontStyleKey, FontStyleKey[]> = {
        bolditalic: ['bolditalic', 'bold', 'italic', 'normal'],
        bold: ['bold', 'normal'],
        italic: ['italic', 'normal'],
        normal: ['normal'],
    };
    for (const s of order[desired]) if (f[s]) return f[s];
    return f.normal;
}

/**
 * Garante que a fonte (família + estilo) esteja registrada no jsPDF e retorna
 * { family, style } prontos para pdf.setFont(). Para nativas, não faz download.
 */
export async function ensurePdfFont(
    pdf: any,
    registered: Set<string>,
    family: string | undefined,
    desired: FontStyleKey,
): Promise<{ family: string; style: FontStyleKey }> {
    const def = getFontDef(family);

    if (def.kind === 'native') {
        return { family: def.pdfFamily || 'helvetica', style: desired };
    }

    const fileKey = pickFile(def, desired);
    if (!fileKey) return { family: 'helvetica', style: desired };

    const cacheKey = `${def.key}:${desired}`;
    if (!registered.has(cacheKey)) {
        const b64 = await fetchFontBase64(fileKey);
        const vfsName = `${fileKey}.ttf`;
        pdf.addFileToVFS(vfsName, b64);
        pdf.addFont(vfsName, def.key, desired);
        registered.add(cacheKey);
    }
    return { family: def.key, style: desired };
}
