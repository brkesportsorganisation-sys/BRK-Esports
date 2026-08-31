const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateKeys() {
  console.log("Migrating SiteSettings keys from BRK to EZBD...");
  
  // 1. Rename BRK_ESPORTS_SQUADS
  let { error: err1 } = await supabase
    .from('SiteSetting')
    .update({ key: 'EZBD_ESPORTS_SQUADS' })
    .eq('key', 'BRK_ESPORTS_SQUADS');
  
  if (err1) {
    console.error("Error migrating BRK_ESPORTS_SQUADS:", err1);
  } else {
    console.log("Successfully migrated BRK_ESPORTS_SQUADS to EZBD_ESPORTS_SQUADS.");
  }
  
  // 2. Rename BRK_ESPORTS_CHAMPIONS
  let { error: err2 } = await supabase
    .from('SiteSetting')
    .update({ key: 'EZBD_ESPORTS_CHAMPIONS' })
    .eq('key', 'BRK_ESPORTS_CHAMPIONS');
    
  if (err2) {
    console.error("Error migrating BRK_ESPORTS_CHAMPIONS:", err2);
  } else {
    console.log("Successfully migrated BRK_ESPORTS_CHAMPIONS to EZBD_ESPORTS_CHAMPIONS.");
  }
}

migrateKeys();
