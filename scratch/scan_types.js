const fs = require('fs');
const path = require('path');

// Read all types in lib/types.ts or similar
let typesFile = '';
if (fs.existsSync('lib/types.ts')) {
  typesFile = fs.readFileSync('lib/types.ts', 'utf8');
}

console.log('--- Scanning lib/types.ts ---');
const interfaceRegex = /export interface (\w+)\s*\{([^}]+)\}/g;
let ifMatch;
const definedInterfaces = {};
while ((ifMatch = interfaceRegex.exec(typesFile)) !== null) {
  const name = ifMatch[1];
  const body = ifMatch[2];
  const props = body.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//') && !line.startsWith('/*'))
    .map(line => {
      const pMatch = line.match(/^(\w+)\??\s*:/);
      return pMatch ? pMatch[1] : null;
    })
    .filter(Boolean);
  definedInterfaces[name] = props;
}

console.log('Interfaces defined in types.ts:', Object.keys(definedInterfaces));

// Let's check all files for any other interface or model definitions
function scanAllCode(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let results = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git', 'scratch'].includes(entry.name)) {
        results = results.concat(scanAllCode(fullPath));
      }
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const allTsFiles = scanAllCode('.');

// Look for all SQL references or table structures
console.log(`Scanned ${allTsFiles.length} TypeScript files.`);

// Let's print the interfaces for User, Tournament, Payment, Announcement, etc.
for (const [key, props] of Object.entries(definedInterfaces)) {
  console.log(`\nInterface ${key}:`, props);
}
