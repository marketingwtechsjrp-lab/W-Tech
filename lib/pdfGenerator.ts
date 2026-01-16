import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabaseClient';

export const generateAgendaPDF = async (siteTitle: string = 'W-TECH BRASIL', logoUrl: string = '') => {
    try {
        // Fetch ALL published courses for the agenda
        const { data: courses, error } = await supabase
            .from('SITE_Courses')
            .select('*')
            .eq('status', 'Published')
            .order('date', { ascending: true });

        if (error) throw error;
        if (!courses || courses.length === 0) {
            alert("Nenhum curso encontrado para gerar a agenda.");
            return;
        }

        const doc = new jsPDF();
        const address = "R. Zumbi dos Palmares, 410 - Jd. Paulista - São José do Rio Preto - SP";
        const phone = "17 3231-2858";

        // Add Logo
        if (logoUrl) {
            try {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = logoUrl;
                await new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
                if (img.complete && img.naturalWidth > 0) {
                    doc.addImage(img, 'PNG', 15, 10, 35, 0);
                }
            } catch (e) {
                console.error("Logo PDF Error:", e);
            }
        }

        // Header Info (Right aligned)
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(siteTitle, 195, 20, { align: 'right' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(address, 195, 26, { align: 'right' });
        doc.text(`Telefone: ${phone}`, 195, 31, { align: 'right' });
        doc.text(`E-mail: contato@w-techbrasil.com.br`, 195, 36, { align: 'right' });

        // Accent Line
        doc.setDrawColor(212, 175, 55); // Gold
        doc.setLineWidth(0.5);
        doc.line(15, 45, 195, 45);

        // Title
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`AGENDA OFICIAL DE TREINAMENTOS - ${new Date().getFullYear()}`, 15, 55);

        const tableData = courses.map((c: any) => [
            new Date(c.date).toLocaleDateString('pt-BR'),
            c.title,
            c.location,
            c.instructor || 'Especialista W-Tech',
            c.location_type || 'Presencial'
        ]);

        autoTable(doc, {
            startY: 65,
            head: [['Data', 'Curso', 'Local', 'Instrutor', 'Tipo']],
            body: tableData,
            headStyles: { 
                fillColor: [0, 0, 0], 
                textColor: [255, 255, 255], 
                fontStyle: 'bold',
                fontSize: 10
            },
            bodyStyles: {
                fontSize: 9
            },
            alternateRowStyles: { 
                fillColor: [250, 250, 250] 
            },
            margin: { left: 15, right: 15 },
            theme: 'striped'
        });

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} - Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
        }

        doc.save(`agenda_wtech_${new Date().getFullYear()}.pdf`);
    } catch (error) {
        console.error("PDF Generation failed:", error);
        alert("Não foi possível gerar o PDF. Tente novamente.");
    }
};
