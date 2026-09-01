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

async function checkTour() {
  const { data: t } = await supabase
    .from('Tournament')
    .select('id, title, registeredCount, maxTeams')
    .ilike('title', '%GIVEAWAY%');
  console.log("Tournament:", JSON.stringify(t, null, 2));

  const { data: parts } = await supabase
    .from('Participant')
    .select('*');
  console.log("Participants count:", parts?.length);
  parts?.forEach(p => console.log(JSON.stringify(p)));
}

checkTour();
