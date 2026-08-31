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

async function testAll() {
  const { data: setting } = await supabase
    .from('SiteSetting')
    .select('*')
    .eq('key', 'EZBD_ESPORTS_SQUADS')
    .single();

  const squads = JSON.parse(setting.value);

  const { data: users } = await supabase
    .from('User')
    .select('id, name, email, inGameName, accountNumber, freeFireUid');

  console.log("=== CHECKING WHAT EACH USER GETS ===");
  for (const u of users) {
    const userAccountNumber = (u.accountNumber || '').trim().toUpperCase();
    const userUid = (u.freeFireUid || '').trim();

    const isUserMember = (m) => {
      if (!m) return false;
      if (m.userId === u.id || m.id === u.id) return true;
      if (userAccountNumber && m.accountNumber && m.accountNumber.toUpperCase() === userAccountNumber) return true;
      if (userUid && m.freeFireUid && m.freeFireUid === userUid) return true;
      return false;
    };

    const isUserLeader = (s) => {
      return s.leaderId === u.id || s.createdBy === u.id;
    };

    const found = squads.filter(s => 
      !s.isDisbanded && 
      (
        isUserLeader(s) ||
        (Array.isArray(s.members) && s.members.some(m => isUserMember(m) && (m.status === 'ACTIVE' || !m.status)))
      )
    );

    if (found.length > 0) {
      console.log(`User: ${u.name} (${u.email}, ${u.id}) -> SQUADS (${found.length}): ${found.map(s => s.name).join(', ')}`);
    } else {
      console.log(`User: ${u.name} (${u.email}, ${u.id}) -> NO SQUADS`);
    }
  }
}

testAll();
