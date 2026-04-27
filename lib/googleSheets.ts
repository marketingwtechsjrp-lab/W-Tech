/**
 * Script para cadastrar novos leads da Landing Page Gas Garage no Google Sheets.
 * Utiliza o ID da planilha fornecido pelo Daniel.
 */

export const submitToGoogleSheets = async (name, phone) => {
    try {
        const scriptURL = 'https://script.google.com/macros/s/AKfycbwccY-jxPD_1IrCLmTxYHQNBl58in8g6Zzf55TAwGrQJ8I1ugNfcQiwWoYTh8tEZz8M/exec'; // Web App URL final
        
        const payload = {
            name,
            phone,
            timestamp: new Date().toISOString(),
            source: 'LP_Chao_de_Oficina'
        };

        // Note: Google Apps Script Web Apps usually require no-cors or handling redirects
        await fetch(scriptURL, {
            method: 'POST',
            mode: 'no-cors', // Necessário para Google Apps Script sem complexidade de CORS
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        console.log('Lead enviado para Google Sheets com sucesso.');
    } catch (error) {
        console.error('Erro ao enviar lead para Google Sheets:', error);
    }
};
