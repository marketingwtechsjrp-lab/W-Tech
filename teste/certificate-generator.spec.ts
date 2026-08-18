import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test('incorpora uma imagem PNG remota no PDF do certificado', async ({ page }, testInfo) => {
    const backgroundUrl = 'https://certificate.test/background.png';
    const background = fs.readFileSync('public/backgound-alex-crepaldi.png');

    await page.route(backgroundUrl, route => route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: background
    }));
    await page.goto('/');

    const downloadPromise = page.waitForEvent('download');
    await page.evaluate(async ({ backgroundUrl }) => {
        const generatorPath = '/components/admin/Certificates/CertificateGenerator.ts';
        const { generateCertificatesPDF } = await import(/* @vite-ignore */ generatorPath);
        await generateCertificatesPDF(
            {
                id: 'layout-test',
                name: 'Teste',
                type: 'Certificate',
                backgroundUrl,
                elements: [],
                dimensions: { width: 842, height: 595, bgSize: 'cover', bgPosition: 'center' },
                createdAt: new Date().toISOString()
            },
            { title: 'Certificado Teste', date: '2026-08-14' },
            [{ id: 'enrollment-test', studentName: 'Aluno Teste' }]
        );
    }, { backgroundUrl });

    const download = await downloadPromise;
    const pdfPath = testInfo.outputPath('certificado-com-fundo.pdf');
    await download.saveAs(pdfPath);

    const pdf = fs.readFileSync(pdfPath);
    expect(download.suggestedFilename()).toBe('Certificado Teste_Certificates.pdf');
    expect(pdf.byteLength).toBeGreaterThan(10_000);
    expect(pdf.toString('latin1')).toContain('/Subtype /Image');
});

test('não salva um certificado em branco quando o fundo falha', async ({ page }) => {
    const backgroundUrl = 'https://certificate.test/missing.png';
    await page.route(backgroundUrl, route => route.fulfill({ status: 404, body: 'not found' }));
    await page.goto('/');

    const message = await page.evaluate(async ({ backgroundUrl }) => {
        const generatorPath = '/components/admin/Certificates/CertificateGenerator.ts';
        const { loadCertificateBackgroundForPdf } = await import(/* @vite-ignore */ generatorPath);
        try {
            await loadCertificateBackgroundForPdf(backgroundUrl);
            return '';
        } catch (error) {
            return error instanceof Error ? error.message : String(error);
        }
    }, { backgroundUrl });

    expect(message).toContain('HTTP 404');
});
