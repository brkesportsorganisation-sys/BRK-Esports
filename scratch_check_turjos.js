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

async function checkAllTurjos() {
  console.log("=== ALL USERS WITH TURJO OR ADMIN ===");
  const { data: users } = await supabase
    .from('User')
    .select('*')
    .or('name.ilike.%turjo%,email.ilike.%turjo%,role.eq.ADMIN,role.eq.SUPER_ADMIN');
  users?.forEach(u => console.log(JSON.stringify(u, null, 2)));

  console.log("\n=== ALL TEAMS IN SUPABASE TEAM TABLE ===");
  const { data: teams } = await supabase.from('Team').select('*');
  teams?.forEach(t => console.log(JSON.stringify(t, null, 2)));

  console.log("\n=== ALL TEAM MEMBERS IN SUPABASE ===");
  const { data: tm } = await supabase.from('TeamMember').select('*');
  tm?.forEach(m => console.log(JSON.stringify(m, null, 2)));
}

checkAllTurjos();
