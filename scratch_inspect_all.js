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

async function inspect() {
  console.log("--- USERS ---");
  const { data: users, error: uErr } = await supabase
    .from('User')
    .select('id, name, inGameName, email, accountNumber, freeFireUid, role');
  console.log("Total users:", users?.length);
  users?.forEach(u => console.log(JSON.stringify(u)));

  console.log("\n--- SITESETTINGS SQUADS ---");
  const { data: setting } = await supabase
    .from('SiteSetting')
    .select('*')
    .in('key', ['EZBD_ESPORTS_SQUADS', 'BRK_ESPORTS_SQUADS']);
  
  setting?.forEach(s => {
    console.log(`Key: ${s.key}`);
    try {
      const squads = JSON.parse(s.value);
      console.log(`Squads count: ${squads.length}`);
      squads.forEach((sq, idx) => {
        console.log(`\nSquad ${idx + 1}: ${sq.name} (id: ${sq.id})`);
        console.log(`  leaderId: ${sq.leaderId}, createdBy: ${sq.createdBy}, leaderName: ${sq.leaderName}`);
        console.log(`  members (${sq.members?.length || 0}):`, JSON.stringify(sq.members, null, 2));
      });
    } catch(e) {
      console.log("Error parsing JSON:", e.message);
    }
  });

  console.log("\n--- LEGACY TEAMS ---");
  const { data: teams } = await supabase.from('Team').select('*');
  console.log("Teams count:", teams?.length);
  teams?.forEach(t => console.log(JSON.stringify(t)));
}

inspect();
