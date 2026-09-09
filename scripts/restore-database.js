const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Read environment variables from .env.local
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// 2. Load backup data
let backupFile = path.resolve(__dirname, '../supabasebackup.json');
if (!fs.existsSync(backupFile) || fs.statSync(backupFile).size === 0) {
  backupFile = path.resolve(__dirname, '../backup.json');
}

if (!fs.existsSync(backupFile)) {
  console.error('❌ No backup file found at supabasebackup.json or backup.json');
  process.exit(1);
}

console.log('📂 Loading backup from:', backupFile);
const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

// 3. Define dependency order for foreign keys
const tableOrder = [
  'AdminAccount',
  'SiteSetting',
  'Banner',
  'Announcement',
  'VendorAccount',
  'User',
  'Team',
  'TeamMember',
  'Tournament',
  'NotificationSchedule',
  'Notification',
  'DeleteRequest',
  'SpinHistory',
  'LFGPost',
  'AdminActivityLog',
  'UserActivityLog',
  'Conversation',
  'Message',
  'ContactUnlock',
  'SupportTicket',
  'SupportMessage',
  'Participant',
  'Payment',
  'MatchResult',
  'VendorPayoutRequest'
];

async function restore() {
  console.log('🚀 Starting database restoration...\n');
  let totalRestored = 0;

  for (const table of tableOrder) {
    const rows = backupData[table];
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      continue;
    }

    console.log(`⏳ Restoring table "${table}" (${rows.length} records)...`);
    
    // Chunk in batches of 50
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });
      if (error) {
        console.error(`❌ Error on table "${table}" chunk [${i}..${i + chunk.length}]:`, error.message);
      }
    }
    
    console.log(`✅ Completed table "${table}" (${rows.length} records)`);
    totalRestored += rows.length;
  }

  // Check any remaining tables in backupData not in tableOrder
  for (const [table, rows] of Object.entries(backupData)) {
    if (!tableOrder.includes(table) && Array.isArray(rows) && rows.length > 0) {
      console.log(`⏳ Restoring extra table "${table}" (${rows.length} records)...`);
      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });
        if (error) {
          console.error(`❌ Error on extra table "${table}":`, error.message);
        }
      }
      console.log(`✅ Completed extra table "${table}" (${rows.length} records)`);
      totalRestored += rows.length;
    }
  }

  console.log(`\n🎉 Restoration finished successfully! Total ${totalRestored} records restored across all tables.`);
}

restore().catch(err => {
  console.error('Fatal error during restoration:', err);
});
