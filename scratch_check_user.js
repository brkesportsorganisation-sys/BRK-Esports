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

async function checkRegistrationTable() {
  const { data: regData } = await supabase
    .from('Registration')
    .select('*')
    .eq('tournamentId', 'tour_1787923619380_4czqp');
    
  console.log("Registration table records:", regData);
  if (regData && regData.length > 0) {
    await supabase
      .from('Registration')
      .update({
        iglName: 'ADMIN',
        player1Name: 'ADMIN',
        player2Name: 'ADMIN',
        player3Name: 'ADMIN',
        player4Name: 'ADMIN',
      })
      .eq('tournamentId', 'tour_1787923619380_4czqp');
  }
}

checkRegistrationTable();
