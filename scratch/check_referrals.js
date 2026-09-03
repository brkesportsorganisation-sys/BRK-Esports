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

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function check() {
  const { data: users, error } = await supabase
    .from('User')
    .select('id, name, inGameName, referralCode, referredBy, totalReferrals, claimedMilestones, earnings, walletBalance, coinBalance, avatar, freeFireUid, createdAt');

  const countMap = {};
  users.forEach(u => {
    if (u.referredBy) {
      countMap[u.referredBy] = (countMap[u.referredBy] || 0) + 1;
    }
  });
  console.log('ReferredBy Counts:', countMap);
  
  const userMap = {};
  users.forEach(u => userMap[u.id] = u);

  const referrers = users.map(u => {
    const directCount = countMap[u.id] || 0;
    const storedCount = Number(u.totalReferrals) || 0;
    const effectiveCount = Math.max(directCount, storedCount);
    return {
      id: u.id,
      name: u.inGameName || u.name,
      referralCode: u.referralCode,
      directCount,
      storedCount,
      effectiveCount,
      claimedMilestones: u.claimedMilestones,
      coinBalance: u.coinBalance,
      earnings: u.earnings,
    };
  }).filter(u => u.effectiveCount > 0 || u.storedCount > 0)
    .sort((a, b) => b.effectiveCount - a.effectiveCount);

  console.log('Referrers leaderboard preview:', referrers);
}

check();
