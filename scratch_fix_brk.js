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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAppIds() {
  console.log("Fetching users...");
  const { data: users, error } = await supabase
    .from('User')
    .select('id, accountNumber');

  if (error) {
    console.error("Error fetching users:", error);
    return;
  }

  let updatedCount = 0;
  for (const user of users) {
    if (user.accountNumber && user.accountNumber.startsWith('BRK-')) {
      const newAcc = user.accountNumber.replace('BRK-', 'EZBD-');
      console.log(`Updating user ${user.id}: ${user.accountNumber} -> ${newAcc}`);
      
      const { error: updateError } = await supabase
        .from('User')
        .update({ accountNumber: newAcc })
        .eq('id', user.id);
        
      if (updateError) {
        console.error(`Error updating user ${user.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }
  
  console.log(`Updated ${updatedCount} user account numbers.`);
}

fixAppIds();
