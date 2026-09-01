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

async function checkUser() {
  const { data: users } = await supabase
    .from('User')
    .select('*')
    .in('email', ['turjo0424@gmail.com', 'ytchannelturjo@gmail.com', 'tsturjo2009@gmail.com', 'tsturjo57@gmail.com']);
    
  console.log("Users:", JSON.stringify(users, null, 2));

  const { data: setting } = await supabase
    .from('SiteSetting')
    .select('*')
    .eq('key', 'EZBD_ESPORTS_SQUADS')
    .single();

  const squads = JSON.parse(setting.value);
  const oc = squads.find(s => s.name === 'OLD CLASHERS');
  console.log("OLD CLASHERS:", JSON.stringify(oc, null, 2));
}

checkUser();
