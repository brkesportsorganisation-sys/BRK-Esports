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

async function testApiLogic() {
  const referralsRes = await supabase
    .from('User')
    .select('id, name, avatar, freeFireUid, inGameName, referralCode, totalReferrals, claimedMilestones, coinBalance, promoBalance, earnings, createdAt')
    .eq('isBanned', false)
    .order('totalReferrals', { ascending: false })
    .order('createdAt', { ascending: true })
    .limit(50);

  const getReferralTierBadge = (count) => {
    if (count >= 300) return 'Diamond Jackpot 💎';
    if (count >= 100) return 'Gold Pass 👑';
    if (count >= 50) return 'Silver Pass ⚔️';
    if (count >= 10) return 'Bronze Pass 🥉';
    if (count >= 1) return 'Rising Star 🌟';
    return 'Starter 🌱';
  };

  const referrals = (referralsRes.data || []).map((u, index) => {
    const totalReferrals = Number(u.totalReferrals) || 0;
    return {
      rank: index + 1,
      id: u.id,
      name: u.inGameName || u.name || 'Player',
      inGameName: u.inGameName,
      avatar: u.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150',
      referralCode: u.referralCode || `REF_${(u.id || '').slice(-4).toUpperCase()}`,
      ffUid: u.freeFireUid || undefined,
      totalReferrals,
      claimedMilestones: Array.isArray(u.claimedMilestones) ? u.claimedMilestones : [],
      tierBadge: getReferralTierBadge(totalReferrals),
      coinBalance: Number(u.coinBalance) || 0,
      promoBalance: Number(u.promoBalance) || 0,
      earnings: Number(u.earnings) || 0,
      createdAt: u.createdAt,
    };
  });

  console.log('Processed referrals count:', referrals.length);
  console.log('Top 5 referrals:', referrals.slice(0, 5));
}

testApiLogic();
