const { createClient } = require('@supabase/supabase-js');

const url = 'https://amjenxlohtloytdjvird.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtamVueGxvaHRsb3l0ZGp2aXJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjgwMjg4OSwiZXhwIjoyMTAyMzc4ODg5fQ.KKgJN45aOw-Kn2c30sRYwJU9YYetBe85RP_IcT8paaA';

const supabase = createClient(url, key);

async function testFullPersistence() {
  console.log('1. Reading current squads from Supabase SiteSetting...');
  const { data: current, error: readErr } = await supabase
    .from('SiteSetting')
    .select('value')
    .eq('key', 'BRK_ESPORTS_SQUADS')
    .maybeSingle();

  console.log('Current value in DB:', current, 'read error:', readErr);

  const testSquad = {
    id: 'squad_live_test_1',
    name: 'OLD CLASHERS',
    tag: 'OCR',
    game: 'FREE_FIRE',
    logoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200',
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200',
    createdBy: 'user_1',
    leaderId: 'user_1',
    leaderName: 'BRK E-SPORTS ORGANISATION',
    description: 'Official registered esports squad roster.',
    requireApprovalToJoin: true,
    inviteToken: 'tok_ocr_live',
    matchesPlayed: 0,
    matchesWon: 0,
    totalKills: 0,
    totalEarnings: 0,
    members: [
      {
        id: 'mem_1',
        squadId: 'squad_live_test_1',
        userId: 'user_1',
        userName: 'BRK E-SPORTS ORGANISATION',
        userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=BRK',
        accountNumber: 'BRK-529922',
        freeFireUid: '1234567890',
        memberType: 'PLAYER',
        inGameRole: 'IGL',
        isLeader: true,
        joinedAt: new Date().toISOString(),
        status: 'ACTIVE'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  console.log('2. Saving squad to Supabase SiteSetting...');
  const { error: saveErr } = await supabase
    .from('SiteSetting')
    .upsert({
      id: 'setting_squads_data',
      key: 'BRK_ESPORTS_SQUADS',
      value: JSON.stringify([testSquad]),
      updatedAt: new Date().toISOString()
    }, { onConflict: 'key' });

  console.log('Save error:', saveErr ? saveErr.message : 'NONE (SUCCESS)');

  console.log('3. Reading back from Supabase to confirm persistent storage...');
  const { data: readBack, error: rbErr } = await supabase
    .from('SiteSetting')
    .select('value')
    .eq('key', 'BRK_ESPORTS_SQUADS')
    .maybeSingle();

  if (readBack?.value) {
    const squads = JSON.parse(readBack.value);
    console.log('SUCCESS! Persisted squads count:', squads.length, 'Squad Name:', squads[0].name);
  } else {
    console.error('FAILED to read persisted squads:', rbErr);
  }
}

testFullPersistence();
