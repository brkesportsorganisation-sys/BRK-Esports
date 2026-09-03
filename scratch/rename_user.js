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

async function updateUserName() {
  const targetId = 'usr_1788251915472_dbao0';
  const newName = 'Tirtho Bot';

  // 1. Fetch current user
  const { data: user, error: fetchErr } = await supabase
    .from('User')
    .select('*')
    .eq('id', targetId)
    .single();

  if (fetchErr || !user) {
    console.error('Failed to find user:', fetchErr);
    return;
  }

  console.log('Found user before update:', user.name, user.inGameName, user.referralCode);

  // 2. Update User table
  const { data: updatedUser, error: updateErr } = await supabase
    .from('User')
    .update({
      name: newName,
      inGameName: newName,
    })
    .eq('id', targetId)
    .select()
    .single();

  if (updateErr) {
    console.error('Error updating User:', updateErr);
  } else {
    console.log('Successfully updated User to:', updatedUser.name, updatedUser.inGameName);
  }

  // 3. Update any TournamentParticipant / SquadMember / etc where userName is stored
  try {
    await supabase
      .from('TournamentParticipant')
      .update({ userName: newName, playerInGameName: newName })
      .eq('userId', targetId);
  } catch (e) {
    console.warn('TournamentParticipant update notice:', e.message);
  }

  try {
    await supabase
      .from('SquadMember')
      .update({ userName: newName, inGameName: newName })
      .eq('userId', targetId);
  } catch (e) {
    console.warn('SquadMember update notice:', e.message);
  }

  try {
    await supabase
      .from('MatchResult')
      .update({ playerName: newName })
      .eq('userId', targetId);
  } catch (e) {
    console.warn('MatchResult update notice:', e.message);
  }

  // Check all users with similar names or referral code
  const { data: allWithCode } = await supabase
    .from('User')
    .select('id, name, inGameName, referralCode')
    .eq('referralCode', 'REF_6030');

  console.log('Users with REF_6030 after update:', allWithCode);
}

updateUserName();
