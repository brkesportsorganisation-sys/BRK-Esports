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

async function updateSquadNameToAdmins() {
  const { data, error } = await supabase
    .from('Participant')
    .update({
      squadName: 'ADMINS',
    })
    .eq('id', 'REG-VF5CHHOQ')
    .select();

  console.log("Updated Participant:", data, error);
}

updateSquadNameToAdmins();
