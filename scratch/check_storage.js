const fs = require('fs');
const b = JSON.parse(fs.readFileSync('backup.json', 'utf8'));
const str = JSON.stringify(b);
const regex = /https:\/\/[a-zA-Z0-9_\-.]+\.supabase\.co\/storage\/v1\/object\/public\/[a-zA-Z0-9_\-\.\/]+/g;
const matches = str.match(regex) || [];
console.log('Total Supabase storage URLs found in backup:', matches.length);
const unique = [...new Set(matches)];
console.log('Unique storage URLs:', unique.length);
console.log('Sample:', unique.slice(0, 10));

const buckets = new Set();
for (const u of unique) {
  const m = u.match(/\/storage\/v1\/object\/public\/([^/]+)/);
  if (m) buckets.add(m[1]);
}
console.log('Buckets found:', Array.from(buckets));
