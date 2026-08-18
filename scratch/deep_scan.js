const fs = require('fs');
const path = require('path');

function getAllFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git', 'scratch'].includes(entry.name)) {
        getAllFiles(fullPath, fileList);
      }
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const files = getAllFiles('.');

// Extract every query detail
const findings = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find all .from('...')
  const fromMatches = [...content.matchAll(/\.from\(\s*['"]([A-Za-z0-9_]+)['"]\s*\)/g)];
  fromMatches.forEach(m => {
    const table = m[1];
    // Find the surrounding line or function
    const index = m.index;
    const snippet = content.substring(Math.max(0, index - 50), Math.min(content.length, index + 300));
    findings.push({ file, table, snippet });
  });
});

console.log(`Found ${findings.length} table operations.`);

// Group by table and extract column names
const tableCols = {};

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Regex to find table queries with .from('Table')...
  // Let's do token matching
  const regex = /\.from\(\s*['"]([A-Za-z0-9_]+)['"]\s*\)([\s\S]*?)(?=(?:\.from\(|export |const |let |var |async function |function |class |\n\s*\n\s*\n|;$))/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const table = match[1];
    const chain = match[2];
    if (!tableCols[table]) tableCols[table] = new Set();

    // Selects
    const selects = [...chain.matchAll(/\.select\(\s*['"`]([^'"`]+)['"`]\s*\)/g)];
    selects.forEach(s => {
      // Remove nested parentheses
      const clean = s[1].replace(/\([^\)]*\)/g, '');
      clean.split(/[\s,]+/).forEach(p => {
        const col = p.trim().split(':')[0];
        if (col && col !== '*' && !col.includes('!')) {
          tableCols[table].add(col);
        }
      });
    });

    // eq / neq / order / etc
    const filters = [...chain.matchAll(/\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|contains|containedBy|order)\(\s*['"]([A-Za-z0-9_]+)['"]/g)];
    filters.forEach(f => tableCols[table].add(f[1]));

    // insert / update / upsert objects
    // Look for object literals
    const ops = [...chain.matchAll(/\.(?:insert|update|upsert)\(\s*(\[[^\]]*\]|\{[^\}]*\})/g)];
    ops.forEach(op => {
      const objStr = op[1];
      const keys = [...objStr.matchAll(/([A-Za-z0-9_]+)\s*:/g)];
      keys.forEach(k => {
        const col = k[1];
        if (!['http', 'https', 'true', 'false', 'null', 'undefined', 'error', 'message'].includes(col)) {
          tableCols[table].add(col);
        }
      });
    });
  }
});

console.log('\n=== ALL COLUMNS DETECTED PER TABLE ===');
for (const [t, cols] of Object.entries(tableCols)) {
  console.log(`\nTable: ${t} (${cols.size} columns)`);
  console.log(Array.from(cols).sort().join(', '));
}
