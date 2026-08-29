const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const newContent = content.replace(/dark:[^\s"'\`\}]+/g, '');
            if (newContent !== content) {
                // simple cleanup of double spaces
                const cleanContent = newContent.replace(/  +/g, ' ');
                fs.writeFileSync(fullPath, cleanContent, 'utf8');
                console.log(`Cleaned ${fullPath}`);
            }
        }
    }
}
walkDir('./src');
