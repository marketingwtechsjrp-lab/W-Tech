import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to parse args
const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, value] = arg.split('=');
    if (key.startsWith('--')) acc[key.slice(2)] = value || true;
    return acc;
}, {});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
    console.log('\n🚀 W-TECH DEPLOY WIZARD 🚀');
    console.log('============================\n');

    try {
        // 1. Read Package JSON
        const packagePath = path.resolve(__dirname, '../package.json');
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
        console.log(`Current Version: ${pkg.version}`);

        // 2. Determine New Version
        let newVersion = args.version;
        if (!newVersion) {
            const parts = pkg.version.split('.').map(Number);
            const nextPatch = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
            newVersion = await question(`New Version [${nextPatch}]: `) || nextPatch;
        }

        // 3. Determine Title
        let title = args.title;
        if (!title) {
            title = await question('Update Title (e.g. "Correções de Bugs"): ');
        }
        if (!title) { console.error('Title required!'); process.exit(1); }

        // 4. Determine Changes
        let changes = [];
        if (args.changes) {
            changes = args.changes.split(';').map(c => c.trim());
        } else {
            console.log('Enter changes (one per line). Type "DONE" to finish:');
            while (true) {
                const line = await question('> ');
                if (line === 'DONE' || (line === '' && changes.length > 0)) break;
                if (line) changes.push(line);
            }
        }

        if (changes.length === 0) {
            console.log("No changes provided. Aborting.");
            process.exit(1);
        }

        // 5. Update package.json
        pkg.version = newVersion;
        fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
        console.log(`\n✅ Updated package.json to ${newVersion}`);

        // 6. Update CHANGELOG.json
        const jsonPath = path.resolve(__dirname, '../CHANGELOG.json');
        let changelogJson = [];
        if (fs.existsSync(jsonPath)) {
            changelogJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        }
        
        const newEntry = {
            version: newVersion,
            date: new Date().toISOString().split('T')[0],
            title,
            changes,
            author: process.env.USERNAME || process.env.USER || 'WTech Admin'
        };

        changelogJson.unshift(newEntry);
        fs.writeFileSync(jsonPath, JSON.stringify(changelogJson, null, 2));
        console.log('✅ Updated CHANGELOG.json');

        // 7. Update CHANGELOG.md (Text-based)
        const mdPath = path.resolve(__dirname, '../CHANGELOG.md');
        let mdContent = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf-8') : '# Histórico de Atualizações - W-Tech Platform\n\n';
        
        // Remove header if exists to prepend correctly
        if (mdContent.includes('# Histórico de Atualizações')) {
             const lines = mdContent.split('\n');
             const headerIdx = lines.findIndex(l => l.includes('# Histórico'));
             
             const newBlock = [
                 '',
                 `## v${newVersion} (${newEntry.date}) - ${title}`,
                 ...changes.map(c => `- ${c}`)
             ];
             
             // Insert after header
             lines.splice(headerIdx + 2, 0, ...newBlock);
             mdContent = lines.join('\n');
        } else {
            mdContent = `# Histórico de Atualizações - W-Tech Platform\n\n## v${newVersion} (${newEntry.date}) - ${title}\n` + changes.map(c => `- ${c}`).join('\n') + '\n\n' + mdContent;
        }

        fs.writeFileSync(mdPath, mdContent);
        console.log('✅ Updated CHANGELOG.md');

        // 8. Git Operations (Mandatory per user request "somente quando eu atualizar o git")
        console.log('\n📦 Executing GIT Operations...');
        
        try {
            execSync('git add .', { stdio: 'inherit' });
            execSync(`git commit -m "v${newVersion}: ${title}"`, { stdio: 'inherit' });
            execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
            execSync('git push origin main --tags', { stdio: 'inherit' });
            console.log('\n✨ DEPLOY COMPLETE & PUSHED TO GITHUB! ✨');
        } catch (gitError) {
            console.error('❌ Git Operation Failed:', gitError.message);
            console.log('Files were updated locally. Please check git status.');
        }

        // 9. Generate Sitemap
        console.log('\n🌐 Generating Sitemap...');
        try {
            execSync('node scripts/generate-sitemap.js', { stdio: 'inherit' });
            console.log('✅ Sitemap updated!');
        } catch (e) {
            console.error('❌ Failed to generate sitemap:', e.message);
        }

        console.log(`\n🎉 RELEASE ${newVersion} READY! 🎉`);
        console.log('============================');

    } catch (error) {
        console.error('\n❌ Release process failed:', error);
    } finally {
        rl.close();
    }
}

main();
