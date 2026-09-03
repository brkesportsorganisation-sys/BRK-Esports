const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function fixPaymentUserNames() {
  // 1. Fetch all users map
  const { data: users } = await supabase.from('User').select('id, name, email, inGameName, accountNumber');
  const userMap = {};
  for (const u of (users || [])) {
    userMap[u.id] = u;
  }

  // 2. Fetch all payments with null userName
  const { data: payments } = await supabase.from('Payment').select('id, userId, userName, userEmail');
  console.log(`Total payments in DB: ${payments?.length}`);

  let updatedCount = 0;
  for (const p of (payments || [])) {
    if (!p.userName || !p.userEmail || p.userName === 'Player') {
      const u = userMap[p.userId];
      if (u) {
        const newName = u.name || u.inGameName || 'Player';
        const newEmail = u.email || '';
        const { error } = await supabase
          .from('Payment')
          .update({ userName: newName, userEmail: newEmail })
          .eq('id', p.id);

        if (!error) {
          updatedCount++;
          console.log(`Updated payment ${p.id} for user ${p.userId} -> ${newName} (${newEmail})`);
        } else {
          console.error(`Error updating payment ${p.id}:`, error);
        }
      }
    }
  }

  console.log(`Successfully fixed ${updatedCount} payment records!`);
}
fixPaymentUserNames();
