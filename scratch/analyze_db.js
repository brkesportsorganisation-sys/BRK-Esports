const fs = require('fs');
const path = require('path');

// 1. Parse supabase-schema.sql to extract all columns per table
const schemaContent = fs.readFileSync('supabase-schema.sql', 'utf8');

const tableColumns = {};

// Match CREATE TABLE "TableName" (...) or CREATE TABLE TableName (...)
const createTableRegex = /CREATE TABLE (?:IF NOT EXISTS )?["']?([A-Za-z0-9_]+)["']?\s*\(([\s\S]*?)\n\);/gi;
let m;
while ((m = createTableRegex.exec(schemaContent)) !== null) {
  const table = m[1];
  const body = m[2];
  if (!tableColumns[table]) tableColumns[table] = new Set();
  
  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('CONSTRAINT') || trimmed.startsWith('UNIQUE') || trimmed.startsWith('PRIMARY KEY') || trimmed.startsWith('FOREIGN KEY') || trimmed.startsWith('CHECK')) {
      continue;
    }
    const colMatch = trimmed.match(/^["']?([A-Za-z0-9_]+)["']?\s+/);
    if (colMatch) {
      tableColumns[table].add(colMatch[1]);
    }
  }
}

// Match ALTER TABLE "TableName" ADD COLUMN IF NOT EXISTS "colName" ...
const alterAddRegex = /ALTER TABLE (?:ONLY )?["']?([A-Za-z0-9_]+)["']?\s+ADD COLUMN (?:IF NOT EXISTS )?["']?([A-Za-z0-9_]+)["']?/gi;
while ((m = alterAddRegex.exec(schemaContent)) !== null) {
  const table = m[1];
  const col = m[2];
  if (!tableColumns[table]) tableColumns[table] = new Set();
  tableColumns[table].add(col);
}

console.log('=== SCHEMA SUMMARY ===');
for (const [table, cols] of Object.entries(tableColumns)) {
  console.log(`${table}: ${cols.size} columns ->`, Array.from(cols).join(', '));
}

// 2. Scan all files in project
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

// Extract calls from files
const codeTableCols = {};

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find all .from('TableName') blocks and their chained methods
  // e.g. supabaseAdmin.from('User').select('...').eq('id', ...)
  // or .from('User').update({ ... })
  
  const fromMatches = [...content.matchAll(/\.from\(\s*['"]([A-Za-z0-9_]+)['"]\s*\)([\s\S]*?)(?=(?:\.from\(|export |function |const |let |var |async |class |;|\n\s*\n\s*\n))/g)];
  
  fromMatches.forEach(match => {
    const table = match[1];
    const chain = match[2];
    if (!codeTableCols[table]) codeTableCols[table] = { cols: new Set(), refs: [] };
    
    // Check .select('col1, col2, ...')
    const selectMatches = [...chain.matchAll(/\.select\(\s*['"`]([^'"`]+)['"`]\s*\)/g)];
    selectMatches.forEach(sm => {
      const selectStr = sm[1];
      // parse select string: e.g. "id, name, email, currentStreak, Team(id, name)"
      // remove nested brackets like Team(...)
      const flat = selectStr.replace(/\([^\)]*\)/g, '');
      const parts = flat.split(/[\s,]+/);
      parts.forEach(p => {
        const cleaned = p.trim().split(':')[0].split('(')[0];
        if (cleaned && cleaned !== '*' && !cleaned.includes('!')) {
          codeTableCols[table].cols.add(cleaned);
          codeTableCols[table].refs.push({ col: cleaned, file, type: 'select' });
        }
      });
    });
    
    // Check .eq('col', ...), .neq, .gt, .lt, .gte, .lte, .like, .ilike, .is, .in, .order
    const methodMatches = [...chain.matchAll(/\.(eq|neq|gt|lt|gte|lte|like|ilike|is|in|order)\(\s*['"]([A-Za-z0-9_]+)['"]/g)];
    methodMatches.forEach(mm => {
      const col = mm[2];
      codeTableCols[table].cols.add(col);
      codeTableCols[table].refs.push({ col, file, type: mm[1] });
    });
    
    // Check .update({ key: val }), .insert([{ key: val }]), .upsert({ key: val })
    const objMatches = [...chain.matchAll(/\.(insert|update|upsert)\(\s*(\[[^\]]*\]|\{[^\}]*\})/g)];
    objMatches.forEach(om => {
      const objStr = om[2];
      // extract keys
      const keyMatches = [...objStr.matchAll(/(?:[{,]\s*|\n\s*)([A-Za-z0-9_]+)\s*:/g)];
      keyMatches.forEach(km => {
        const col = km[1];
        if (col && !['true', 'false', 'null', 'undefined'].includes(col)) {
          codeTableCols[table].cols.add(col);
          codeTableCols[table].refs.push({ col, file, type: om[1] });
        }
      });
    });
  });
});

console.log('\n=== CODE USAGE VS SCHEMA COMPARISON ===');
const missingColsReport = {};

for (const [table, usage] of Object.entries(codeTableCols)) {
  const schemaSet = tableColumns[table] || new Set();
  const missing = [];
  for (const col of usage.cols) {
    if (!schemaSet.has(col)) {
      missing.push(col);
      if (!missingColsReport[table]) missingColsReport[table] = [];
      const refFiles = usage.refs.filter(r => r.col === col).map(r => `${r.file} (${r.type})`);
      missingColsReport[table].push({ col, refFiles: Array.from(new Set(refFiles)) });
    }
  }
  if (missing.length > 0) {
    console.log(`\n🚨 Table "${table}" is MISSING columns in schema:`, missing);
  } else {
    console.log(`✅ Table "${table}": all ${usage.cols.size} referenced columns exist in schema.`);
  }
}

console.log('\n=== DETAILED MISSING COLUMNS ===');
console.log(JSON.stringify(missingColsReport, null, 2));
