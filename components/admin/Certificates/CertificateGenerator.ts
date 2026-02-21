import jsPDF from 'jspdf';
import { CertificateLayout, Enrollment, Course } from '../../../types';
import { formatDateLocal, formatDateRange } from '../../../lib/utils';
import QRCode from 'qrcode';

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

    for (let i = 0; i < enrollments.length; i++) {
        const enrollment = enrollments[i];
        if (i > 0) pdf.addPage();

        // 1. Add Background
        if (layout.backgroundUrl) {
            try {
                 // Optimization: Load image once outside loop if possible, but jsPDF handles it ok.
                 // We need to fetch the image to base64 or provide URL if CORS allows.
                 // For now, we assume the URL is accessible.
                 const imgProps = pdf.getImageProperties(layout.backgroundUrl);
                 pdf.addImage(layout.backgroundUrl, 'JPEG', 0, 0, layout.dimensions.width, layout.dimensions.height);
            } catch (e) {
                console.error('Error loading background:', e);
            }
        }

        // 2. Add Elements
        for (const el of layout.elements) {
            if (el.type === 'Text') {
                pdf.setFont(el.fontFamily || 'helvetica');
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
