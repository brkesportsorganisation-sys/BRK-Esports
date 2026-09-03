const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function checkWalPayments() {
  const { data: payments, error } = await supabase
    .from('Payment')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(10);

  console.log('Payments count:', payments?.length, error);
  for (const p of (payments || [])) {
    console.log(`Payment: ID: ${p.id} | User: ${p.userName} (${p.userEmail}) | UserID: ${p.userId} | Method: ${p.method} | Amount: ${p.amount} | Trx: ${p.trxId} | Notes: ${p.notes}`);
    // Also fetch the user from User table
    if (p.userId) {
      const { data: u } = await supabase.from('User').select('id, name, email, inGameName, accountNumber').eq('id', p.userId).maybeSingle();
      console.log(`   -> Associated User:`, u);
    }
  }
}
checkWalPayments();
