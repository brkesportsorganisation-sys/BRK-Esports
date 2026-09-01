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

async function testMatching() {
  const { data: setting } = await supabase
    .from('SiteSetting')
    .select('*')
    .eq('key', 'EZBD_ESPORTS_SQUADS')
    .single();

  const squads = JSON.parse(setting.value);

  const { data: users } = await supabase
    .from('User')
    .select('*');

  console.log("=== SIMULATING resolveIsMySquad FOR ALL USERS ===");
  users.forEach(user => {
    squads.forEach(squad => {
      // Updated resolveIsMySquad implementation:
      const resolveIsMySquad = (s, u) => {
        if (!u || !u.id) return false;
        if (s.leaderId === u.id || s.createdBy === u.id) return true;
        if (Array.isArray(s.members)) {
          return s.members.some(m => 
            (m.status === 'ACTIVE' || !m.status) &&
            (m.userId === u.id || m.id === u.id)
          );
        }
        return false;
      };

      if (resolveIsMySquad(squad, user)) {
        console.log(`MATCH: User "${user.name}" (${user.email}, ${user.id}) -> Squad "${squad.name}" (id: ${squad.id})`);
      }
    });
  });
}

testMatching();
