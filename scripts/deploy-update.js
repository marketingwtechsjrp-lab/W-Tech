import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
    console.log('\n🚀 W-TECH DEPLOY WIZARD 🚀');
    console.log('============================\n');

    // 1. Read Package JSON
    const packagePath = path.resolve(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    console.log(`Current Version: ${pkg.version}`);

    // 2. Ask for new version
    const parts = pkg.version.split('.').map(Number);
    const nextPatch = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    
    const newVersion = await question(`New Version [${nextPatch}]: `) || nextPatch;
    
    // 3. Ask for Title and Changes
    const title = await question('Update Title (e.g. "Correções de Bugs"): ');
    if (!title) { console.error('Title required!'); process.exit(1); }
    
    console.log('Enter changes (one per line). Type "DONE" to finish:');
    const changes = [];
    while (true) {
        const line = await question('> ');
        if (line === 'DONE' || line === '') break;
        changes.push(line);
    }

    if (changes.length === 0) {
        console.log("No changes provided. Aborting.");
        process.exit(1);
    }

    // 4. Update package.json
    pkg.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
    console.log(`\n✅ Updated package.json to ${newVersion}`);

    // 5. Update CHANGELOG.json
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
        author: process.env.USERNAME || 'Dev'
    };

    changelogJson.unshift(newEntry);
    fs.writeFileSync(jsonPath, JSON.stringify(changelogJson, null, 2));
    console.log('✅ Updated CHANGELOG.json');

    // 6. Update CHANGELOG.md (Text-based)
    const mdPath = path.resolve(__dirname, '../CHANGELOG.md');
    let mdContent = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf-8') : '# Histórico de Atualizações\n\n';
    
    // Remove header if exists to prepend correctly, or just find insertion point
    if (mdContent.includes('# Histórico de Atualizações')) {
         // Insert after header
         const lines = mdContent.split('\n');
         const headerIdx = lines.findIndex(l => l.includes('# Histórico'));
         
         const newBlock = [
             '',
             `## v${newVersion} (${newEntry.date}) - ${title}`,
             ...changes.map(c => `- ${c}`)
         ];
         
         lines.splice(headerIdx + 2, 0, ...newBlock);
         mdContent = lines.join('\n');
    } else {
        // Just Prepend
        mdContent = `# Histórico de Atualizações\n\n## v${newVersion} (${newEntry.date}) - ${title}\n` + changes.map(c => `- ${c}`).join('\n') + '\n\n' + mdContent;
    }

    fs.writeFileSync(mdPath, mdContent);
    console.log('✅ Updated CHANGELOG.md');

    // 7. Git Operations
    const doGit = await question('\nExecute GIT commands (add, commit, tag, push)? (y/N): ');
    if (doGit.toLowerCase() === 'y') {
        try {
            console.log('📦 Git Add...');
            execSync('git add .');
            
            console.log('📦 Git Commit...');
            execSync(`git commit -m "v${newVersion}: ${title}"`);
            
            console.log('🏷️  Git Tag...');
            execSync(`git tag v${newVersion}`);
            
            console.log('🚀 Git Push...');
            execSync('git push origin main --tags');
            
            console.log('\n✨ DEPLOY COMPLETE! ✨');
        } catch (e) {
            console.error('Git Error:', e.message);
        }
    } else {
        console.log('Skipping Git operations.');
    }

    rl.close();
}

main();
