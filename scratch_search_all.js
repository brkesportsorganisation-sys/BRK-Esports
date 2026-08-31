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

async function searchAll() {
  console.log("=== TOURNAMENT REGISTRATIONS ===");
  const { data: regs } = await supabase.from('TournamentRegistration').select('*');
  console.log("Registrations:", regs?.length);
  regs?.forEach(r => console.log(`Reg: ${r.teamName || r.squadName} | userId: ${r.userId} | phone: ${r.phone} | teamId: ${r.teamId}`));

  console.log("\n=== ALL SITE SETTINGS ===");
  const { data: settings } = await supabase.from('SiteSetting').select('key');
  settings?.forEach(s => console.log("Key:", s.key));
}

searchAll();
