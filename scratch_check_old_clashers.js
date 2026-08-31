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

async function check() {
  const { data: setting } = await supabase
    .from('SiteSetting')
    .select('*')
    .eq('key', 'BRK_ESPORTS_SQUADS')
    .single();

  const squads = JSON.parse(setting.value);
  for (const squad of squads) {
    if (squad.name === 'OLD CLASHERS') {
      console.log("OLD CLASHERS members:", JSON.stringify(squad.members.map(m => ({name: m.userName, acc: m.accountNumber})), null, 2));
    }
  }
}
check();
