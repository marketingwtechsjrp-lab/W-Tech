const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'pages', 'LPErgonomia.tsx');
let content = fs.readFileSync(targetFile, 'utf-8');

const separator = '            {/* ═══════════════════════════════════════════ */}';
const parts = content.split(separator);

let indexMentor = -1;
let indexBeneficios = -1;
let indexDepoimentos = -1;
let indexFAQ = -1;
let indexOferta = -1;
let indexFooter = -1;

for (let i = 0; i < parts.length; i++) {
    if (parts[i].includes('O MENTOR')) indexMentor = i;
    else if (parts[i].includes('BENEFÍCIOS')) indexBeneficios = i;
    else if (parts[i].includes('DEPOIMENTOS')) indexDepoimentos = i;
    else if (parts[i].includes('FAQ')) indexFAQ = i;
    else if (parts[i].includes('OFERTA IRRECUSÁVEL')) indexOferta = i;
    else if (parts[i].includes('FOOTER')) indexFooter = i;
}

if (indexMentor > 0 && indexBeneficios > 0 && indexOferta > 0) {
    const topPart = parts.slice(0, Math.min(indexMentor, indexBeneficios, indexDepoimentos, indexFAQ, indexOferta)).join(separator);

    // Assembled array of sections
    const newParts = [
        topPart,
        parts[indexBeneficios],
        parts[indexDepoimentos],
        parts[indexOferta],
        parts[indexMentor],
        parts[indexFAQ],
        parts[indexFooter],
        parts.slice(indexFooter + 1).join(separator)
    ];

    let newContent = newParts.join(separator);
    fs.writeFileSync(targetFile, newContent, 'utf-8');
    console.log('Reordered successfully!');
} else {
    console.log('Error: Could not find all indices.');
    console.log({ indexMentor, indexBeneficios, indexDepoimentos, indexFAQ, indexOferta, indexFooter });
}
