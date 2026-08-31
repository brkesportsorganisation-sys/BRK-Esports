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

async function fixSquads() {
  console.log("Fetching EZBD_ESPORTS_SQUADS...");
  const { data: setting, error } = await supabase
    .from('SiteSetting')
    .select('*')
    .eq('key', 'EZBD_ESPORTS_SQUADS')
    .single();

  if (error || !setting) {
    console.error("Error fetching squads:", error);
    return;
  }

  let squads = JSON.parse(setting.value);

  // 1. Remove Turjo from other squads (AROVIA ESPORTS, SK READ, etc.)
  const turjoUserIds = [
    'usr_1788080728031_q8wnl', // ytchannelturjo@gmail.com
    'usr_1787063629688_d5l04', // tsturjo2009@gmail.com
    'usr_1787035565665_9ubng', // brkesportsorganisation@gmail.com
    'usr_1786889683293_eeytm', // turjo0424@gmail.com
    'usr_1786985661646_dlh60', // tsturjo57@gmail.com
    'usr_1786988240593_bvysd', // devilsempireguild@gmail.com
    'usr_1787249190468_gjr8l', // januarturjo@gmail.com
  ];

  squads.forEach(s => {
    if (s.name !== 'OLD CLASHERS') {
      s.members = (s.members || []).filter(m => !turjoUserIds.includes(m.userId) && !turjoUserIds.includes(m.id));
    }
  });

  // 2. Fix OLD CLASHERS squad
  let oldClashers = squads.find(s => s.name === 'OLD CLASHERS' || s.id === 'squad_live_test_1' || s.id === 'team_1787479603567_p5z4');
  if (oldClashers) {
    oldClashers.id = 'squad_old_clashers_official';
    oldClashers.name = 'OLD CLASHERS';
    oldClashers.tag = 'OCR';
    oldClashers.leaderId = 'usr_1788080728031_q8wnl'; // ytchannelturjo@gmail.com (active user)
    oldClashers.createdBy = 'usr_1788080728031_q8wnl';
    oldClashers.leaderName = 'TURJO_SARKER';
    oldClashers.logoUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200';
    oldClashers.bannerUrl = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200';
    oldClashers.inviteToken = 'OCR3969';
    oldClashers.members = [
      {
        id: 'mem_turjo_1',
        squadId: 'squad_old_clashers_official',
        userId: 'usr_1788080728031_q8wnl',
        userName: 'TURJO_SARKER',
        userAvatar: 'https://lh3.googleusercontent.com/a/ACg8ocLNSe3fFb9NJNXBzPmpfRJLKjtmwwYanV3WZSmIJ6SufZx4Ag=s96-c',
        accountNumber: 'EZBD-302318',
        freeFireUid: '2172142134',
        memberType: 'PLAYER',
        inGameRole: 'IGL',
        isLeader: true,
        joinedAt: new Date().toISOString(),
        status: 'ACTIVE'
      },
      {
        id: 'mem_turjo_2',
        squadId: 'squad_old_clashers_official',
        userId: 'usr_1787063629688_d5l04',
        userName: 'TURJO_SARKER',
        userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Turjo',
        accountNumber: 'EZBD-300596',
        freeFireUid: '2172143722',
        memberType: 'PLAYER',
        inGameRole: 'RUSHER',
        isLeader: false,
        joinedAt: new Date().toISOString(),
        status: 'ACTIVE'
      },
      {
        id: 'mem_turjo_3',
        squadId: 'squad_old_clashers_official',
        userId: 'usr_1787035565665_9ubng',
        userName: 'EZBD ORGANISATION',
        userAvatar: 'https://lh3.googleusercontent.com/a/ACg8ocKuJDVw6_xwnPEpcRQFU1c4BHZkXphSQ6Ed8ysQOU1HZjzKAQ=s96-c',
        accountNumber: 'EZBD-528822',
        freeFireUid: '',
        memberType: 'PLAYER',
        inGameRole: 'SNIPER',
        isLeader: false,
        joinedAt: new Date().toISOString(),
        status: 'ACTIVE'
      }
    ];
  }

  // Update in SiteSetting
  const { error: saveErr } = await supabase
    .from('SiteSetting')
    .update({ value: JSON.stringify(squads) })
    .eq('key', 'EZBD_ESPORTS_SQUADS');

  if (saveErr) {
    console.error("Failed to save squads:", saveErr);
  } else {
    console.log("Successfully cleaned and updated squads in EZBD_ESPORTS_SQUADS!");
  }

  // Update in Team table as well
  await supabase
    .from('Team')
    .upsert({
      id: 'squad_old_clashers_official',
      name: 'OLD CLASHERS',
      tag: 'OCR',
      logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
      captainId: 'usr_1788080728031_q8wnl',
      inviteCode: 'OCR3969',
      captainName: 'TURJO_SARKER',
      membersCount: 3,
      wins: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

  console.log("Updated legacy Team table for OLD CLASHERS!");
}

fixSquads();
