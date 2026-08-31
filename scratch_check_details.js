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

async function checkDetails() {
  const { data: setting } = await supabase
    .from('SiteSetting')
    .select('*')
    .eq('key', 'EZBD_ESPORTS_SQUADS')
    .single();

  const squads = JSON.parse(setting.value);
  console.log("=== ALL SQUADS IN EZBD_ESPORTS_SQUADS ===");
  squads.forEach((s, idx) => {
    console.log(`[${idx}] ${s.name} (id: ${s.id})`);
    console.log(`    Leader: ${s.leaderName} (leaderId: ${s.leaderId}, createdBy: ${s.createdBy})`);
    console.log(`    Members count: ${s.members?.length}`);
    s.members?.forEach(m => {
      console.log(`      - ${m.userName} | userId: ${m.userId} | role: ${m.inGameRole} | isLeader: ${m.isLeader} | status: ${m.status} | acct: ${m.accountNumber} | ffUid: ${m.freeFireUid}`);
    });
  });

  const { data: users } = await supabase
    .from('User')
    .select('id, name, email, inGameName, accountNumber, freeFireUid')
    .order('createdAt', { ascending: false });

  console.log("\n=== RECENT USERS ===");
  users?.slice(0, 10).forEach(u => {
    console.log(`User: ${u.name} (${u.email}) | id: ${u.id} | inGame: ${u.inGameName} | acct: ${u.accountNumber} | ffUid: ${u.freeFireUid}`);
  });
}

checkDetails();
