import jsPDF from 'jspdf';
import { CertificateLayout, Enrollment, Course } from '../../../types';
import { formatDateLocal, formatDateRange } from '../../../lib/utils';
import QRCode from 'qrcode';
import { toJsPdfStyle, ensurePdfFont } from './certificateFonts';

type PdfImageFormat = 'PNG' | 'JPEG' | 'WEBP';

interface PdfBackgroundImage {
    dataUrl: string;
    format: PdfImageFormat;
}

const detectPdfImageFormat = (mimeType: string, source: string): PdfImageFormat | null => {
    const normalizedMime = mimeType.toLowerCase().split(';')[0].trim();
    if (normalizedMime === 'image/png') return 'PNG';
    if (normalizedMime === 'image/jpeg' || normalizedMime === 'image/jpg') return 'JPEG';
    if (normalizedMime === 'image/webp') return 'WEBP';

    const cleanSource = source.toLowerCase().split(/[?#]/)[0];
    if (cleanSource.endsWith('.png')) return 'PNG';
    if (cleanSource.endsWith('.jpg') || cleanSource.endsWith('.jpeg')) return 'JPEG';
    if (cleanSource.endsWith('.webp')) return 'WEBP';
    return null;
};

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem do certificado.'));
    reader.readAsDataURL(blob);
});

/** Baixa e converte a arte remota para um formato que o jsPDF realmente incorpora. */
export const loadCertificateBackgroundForPdf = async (source: string): Promise<PdfBackgroundImage> => {
    const normalizedSource = source.trim();
    if (!normalizedSource) throw new Error('O modelo do certificado não possui imagem de fundo.');

    if (normalizedSource.startsWith('data:')) {
        const mimeType = normalizedSource.slice(5, normalizedSource.indexOf(','));
        const format = detectPdfImageFormat(mimeType, normalizedSource);
        if (!format) throw new Error('O formato da imagem de fundo não é compatível com PDF. Use PNG, JPG ou WebP.');
        return { dataUrl: normalizedSource, format };
    }

    let response: Response;
    try {
        response = await fetch(normalizedSource, {
            mode: 'cors',
            credentials: 'omit'
        });
    } catch {
        throw new Error('Não foi possível baixar a imagem de fundo do certificado.');
    }

    if (!response.ok) {
        throw new Error(`Não foi possível baixar a imagem de fundo do certificado (HTTP ${response.status}).`);
    }

    const blob = await response.blob();
    if (!blob.size) throw new Error('A imagem de fundo do certificado está vazia.');

    const format = detectPdfImageFormat(blob.type, normalizedSource);
    if (!format) throw new Error('O formato da imagem de fundo não é compatível com PDF. Use PNG, JPG ou WebP.');

    return {
        dataUrl: await blobToDataUrl(blob),
        format
    };
};

export const generateCertificatesPDF = async (
    layout: CertificateLayout,
    course: Course,
    enrollments: Enrollment[]
) => {
    // Determine orientation and size
    const isPortrait = layout.dimensions.width < layout.dimensions.height;
    const orientation = isPortrait ? 'p' : 'l';
    const format = [layout.dimensions.width, layout.dimensions.height]; // Custom size in points

    // Create PDF
    // 'pt' (points) is standard for specific dimensions
    const pdf = new jsPDF({
        orientation: orientation,
        unit: 'pt',
        format: format
    });

    // Fontes embutidas já registradas neste PDF (evita re-registrar a cada página)
    const registeredFonts = new Set<string>();

    // jsPDF não baixa uma URL remota recebida por addImage. A arte precisa ser
    // carregada e convertida antes; fazer isso uma vez também evita um download
    // por aluno nos lotes de certificados.
    let backgroundImage: PdfBackgroundImage | null = null;
    if (layout.backgroundUrl) {
        backgroundImage = await loadCertificateBackgroundForPdf(layout.backgroundUrl);
    }

    for (let i = 0; i < enrollments.length; i++) {
        const enrollment = enrollments[i];
        if (i > 0) pdf.addPage();

        // 1. Add Background
        if (backgroundImage) {
            const imgProps = pdf.getImageProperties(backgroundImage.dataUrl);
            const cw = layout.dimensions.width;
            const ch = layout.dimensions.height;
            const iw = imgProps.width;
            const ih = imgProps.height;

            const bgSize = layout.dimensions.bgSize || 'cover';
            const bgPosition = layout.dimensions.bgPosition || 'center';
            const bgX = layout.dimensions.bgX !== undefined ? layout.dimensions.bgX : 50;
            const bgY = layout.dimensions.bgY !== undefined ? layout.dimensions.bgY : 50;
            const bgW = layout.dimensions.bgW !== undefined ? layout.dimensions.bgW : 100;
            const bgH = layout.dimensions.bgH !== undefined ? layout.dimensions.bgH : 100;

            let x = 0, y = 0, w = cw, h = ch;

            if (bgSize === '100% 100%') {
                x = 0;
                y = 0;
                w = cw;
                h = ch;
            } else if (bgSize === 'cover' || bgSize === 'contain') {
                const scale = bgSize === 'cover'
                    ? Math.max(cw / iw, ch / ih)
                    : Math.min(cw / iw, ch / ih);

                w = iw * scale;
                h = ih * scale;

                // Align horizontal
                if (bgPosition === 'left') {
                    x = 0;
                } else if (bgPosition === 'right') {
                    x = cw - w;
                } else {
                    x = (cw - w) / 2;
                }

                // Align vertical
                if (bgPosition === 'top') {
                    y = 0;
                } else if (bgPosition === 'bottom') {
                    y = ch - h;
                } else {
                    y = (ch - h) / 2;
                }
            } else if (bgSize === 'custom') {
                w = cw * (bgW / 100);
                h = ch * (bgH / 100);
                x = (cw - w) * (bgX / 100);
                y = (ch - h) * (bgY / 100);
            }

            pdf.addImage(
                backgroundImage.dataUrl,
                backgroundImage.format,
                x,
                y,
                w,
                h,
                'certificate-background',
                'FAST'
            );
        }

        // 2. Add Elements
        for (const el of layout.elements) {
            if (el.type === 'Text') {
                // Registra a fonte (nativa ou embutida) e aplica estilo (negrito/itálico)
                const desiredStyle = toJsPdfStyle(el.fontWeight, el.fontStyle);
                const f = await ensurePdfFont(pdf, registeredFonts, el.fontFamily, desiredStyle);
                pdf.setFont(f.family, f.style);
                pdf.setFontSize(el.fontSize || 12);
                pdf.setTextColor(el.color || '#000000');
                
                let text = el.content;
                // Replacements
                text = text.replace(/{{student_name}}/g, (enrollment.studentName || '').toUpperCase());
                text = text.replace(/{{course_name}}/g, course.title || '');
                text = text.replace(/{{date}}/g, formatDateLocal(course.date) || '');
                text = text.replace(/{{instructor}}/g, course.instructor || '');
                text = text.replace(/{{enrollment_id}}/g, enrollment.id || '');
                
                // Advanced Date & Location
                if (text.includes('{{date_location}}')) {
                    const dateString = formatDateRange(course.date, course.dateEnd);
                    const locationString = (course.city || course.location || '').toUpperCase();
                    text = text.replace(/{{date_location}}/g, `${dateString} - ${locationString}`);
                }

                // Alignment
                // x, y is usually top-left. jsPDF 'align' option handles logic.
                // Our editor uses top-left, BUT if aligned center, X should be the center point?
                // Standard behavior in Editor:
                // Left: X is left edge.
                // Center: X is center.
                // Right: X is right edge.
                
                pdf.text(text, el.x, el.y, { align: el.align as any || 'left', baseline: 'top' });
            } else if (el.type === 'QRCode') {
                try {
                    let qrContent = el.content;
                    qrContent = qrContent.replace(/{{student_name}}/g, enrollment.studentName || '');
                    qrContent = qrContent.replace(/{{enrollment_id}}/g, enrollment.id || '');
                    qrContent = qrContent.replace(/{{course_name}}/g, course.title || '');

                    const qrUrl = await QRCode.toDataURL(qrContent, { width: 300, margin: 1 }); // Generate high-res
                    pdf.addImage(qrUrl, 'PNG', el.x, el.y, el.width || 100, el.height || 100);
                } catch (err) {
                    console.error('Error generating QR', err);
                    // Fallback
                    pdf.setDrawColor(0);
                    pdf.rect(el.x, el.y, el.width || 50, el.height || 50);
                    pdf.setFontSize(8);
                    pdf.text('Error QR', el.x + 2, el.y + 10);
                }
            }
        }
    }

    pdf.save(`${course.title}_Certificates.pdf`);
};
