import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateGuide() {
    const guidePath = path.resolve(__dirname, '../guia.md');
    if (!fs.existsSync(guidePath)) {
        console.error('guia.md not found');
        return;
    }

    let content = fs.readFileSync(guidePath, 'utf-8');
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    
    // Update "Última Atualização"
    content = content.replace(/\*\*Última Atualização:\*\* \d{2}\/\d{2}\/\d{4}/, `**Última Atualização:** ${dateStr}`);
    
    // Update version from package.json
    const packagePath = path.resolve(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    content = content.replace(/\*\*Versão:\*\* [^\n]+/, `**Versão:** ${pkg.version} (Baseada no \`package.json\`)`);

    fs.writeFileSync(guidePath, content);
    console.log('✅ guia.md updated successfully');
}

updateGuide();
