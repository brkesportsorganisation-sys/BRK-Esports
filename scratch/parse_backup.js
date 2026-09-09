const fs = require('fs');
const path = 'c:/Users/tstur/Downloads/Supabase Snippet Untitled query.csv';

if (!fs.existsSync(path)) {
  console.log('File not found at:', path);
  process.exit(1);
}

const content = fs.readFileSync(path, 'utf8');
const newlineIdx = content.indexOf('\n');
const firstLine = content.slice(0, newlineIdx).trim();
console.log('Header line:', firstLine);

let rawBody = content.slice(newlineIdx + 1).trim();

// CSV quotes unescaping
if (rawBody.startsWith('"') && rawBody.endsWith('"')) {
  rawBody = rawBody.slice(1, -1).replace(/""/g, '"');
}

try {
  const parsed = JSON.parse(rawBody);
  console.log('Successfully parsed JSON!');
  console.log('Tables present:');
  const summary = {};
  for (const [table, rows] of Object.entries(parsed)) {
    summary[table] = Array.isArray(rows) ? rows.length : 0;
  }
  console.table(summary);
  
  // Save clean json
  fs.writeFileSync('c:/Users/tstur/Downloads/components/backup.json', JSON.stringify(parsed, null, 2), 'utf8');
  console.log('Clean backup saved to c:/Users/tstur/Downloads/components/backup.json');
} catch (err) {
  console.error('Error parsing JSON:', err.message);
}
