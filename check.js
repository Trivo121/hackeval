const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            results.push(fullPath);
        }
    });
    return results;
}
const files = walk('frontend/src');
let hasError = false;
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const importRegex = /import\s+.*?\s+from\s+['\"](\.[^'\"]+)['\"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        let resolvedPath = path.resolve(path.dirname(file), importPath);
        
        let found = false;
        const dir = path.dirname(resolvedPath);
        const base = path.basename(resolvedPath);
        
        if (fs.existsSync(dir)) {
            const actualFiles = fs.readdirSync(dir);
            if (actualFiles.includes(base) || actualFiles.includes(base + '.js') || actualFiles.includes(base + '.jsx')) {
                found = true;
            } else {
                const lowerFiles = actualFiles.map(f => f.toLowerCase());
                if (lowerFiles.includes(base.toLowerCase() + '.js') || lowerFiles.includes(base.toLowerCase() + '.jsx')) {
                    const actualBase = actualFiles[lowerFiles.indexOf(base.toLowerCase() + '.js') || lowerFiles.indexOf(base.toLowerCase() + '.jsx')];
                    console.log('Case mismatch in', file, '->', importPath, 'should be', actualBase);
                    hasError = true;
                }
            }
        }
    }
});
if (!hasError) console.log('All imports are case-correct!');
