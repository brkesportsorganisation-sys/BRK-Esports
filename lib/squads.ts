import { supabaseAdmin } from './supabase';
import { Squad, SquadMember, SquadMemberType, InGameRole, SquadMemberStatus, User } from './types';

// Default initial mock squads for fallback and seed
export const INITIAL_SQUADS: Squad[] = [
  {
    id: 'squad_brk_prime',
    name: 'BlackRock Prime',
    tag: 'BRK',
    logoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200',
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200',
    game: 'FREE_FIRE',
    createdBy: 'usr_admin',
    leaderId: 'usr_admin',
    leaderName: 'BRK_Owner',
    description: 'Official Tier-1 Competitive Squad of Black Rock Esports. Daily scrims & tournament champions.',
    requireApprovalToJoin: true,
    inviteToken: 'tok_brk_prime_8899',
    matchesPlayed: 48,
    matchesWon: 32,
    totalKills: 384,
    totalEarnings: 15400,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      {
        id: 'mem_1',
        squadId: 'squad_brk_prime',
        userId: 'usr_admin',
        userName: 'BRK_Owner',
        userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=BRK_Owner',
        accountNumber: 'BRE-100001',
        freeFireUid: '1892837461',
        memberType: 'PLAYER',
        inGameRole: 'IGL',
        isLeader: true,
        joinedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        status: 'ACTIVE',
      },
      {
        id: 'mem_2',
        squadId: 'squad_brk_prime',
        userId: 'usr_player_tanvir',
        userName: 'Tanvir_Sniper',
        userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Tanvir_Sniper',
        accountNumber: 'BRE-100002',
        freeFireUid: '2093847261',
        memberType: 'PLAYER',
        inGameRole: 'SNIPER',
        isLeader: false,
        joinedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
        status: 'ACTIVE',
      },
      {
        id: 'mem_3',
        squadId: 'squad_brk_prime',
        userId: 'usr_player_rakib',
        userName: 'Rakib_Rusher',
        userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Rakib_Rusher',
        accountNumber: 'BRE-100003',
        freeFireUid: '3984726152',
        memberType: 'PLAYER',
        inGameRole: 'RUSHER',
        isLeader: false,
        joinedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        status: 'ACTIVE',
      },
      {
        id: 'mem_4',
        squadId: 'squad_brk_prime',
        userId: 'usr_player_sakib',
        userName: 'Sakib_Support',
        userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sakib_Support',
        accountNumber: 'BRE-100004',
        freeFireUid: '4928173645',
        memberType: 'PLAYER',
        inGameRole: 'SUPPORT',
        isLeader: false,
        joinedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        status: 'ACTIVE',
      }
    ],
  },
  {
    id: 'squad_nova_esports',
    name: 'Nova Assasins',
    tag: 'NOVA',
    logoUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=200',
    bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1200',
    game: 'FREE_FIRE',
    createdBy: 'usr_player_2',
    leaderId: 'usr_player_2',
    leaderName: 'Nova_Leader',
    description: 'Aggressive rushers focused on custom room scrims and cash cups.',
    requireApprovalToJoin: true,
    inviteToken: 'tok_nova_7711',
    matchesPlayed: 24,
    matchesWon: 14,
    totalKills: 198,
    totalEarnings: 6800,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      {
        id: 'mem_nova_1',
        squadId: 'squad_nova_esports',
        userId: 'usr_player_2',
        userName: 'Nova_Leader',
        userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nova_Leader',
        accountNumber: 'BRE-100005',
        freeFireUid: '5928172635',
        memberType: 'PLAYER',
        inGameRole: 'IGL',
        isLeader: true,
        joinedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        status: 'ACTIVE',
      }
    ]
  }
];

let inMemorySquads: Squad[] = [...INITIAL_SQUADS];

/**
 * Loads all squads from Supabase SiteSetting store or in-memory fallback.
 */
export async function getSquads(): Promise<Squad[]> {
  try {
    const { data } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'BRK_ESPORTS_SQUADS')
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemorySquads = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Squads DB] Supabase fallback to memory:', err);
  }

  return inMemorySquads;
}

/**
 * Saves squads list to Supabase.
 */
export async function saveSquads(squads: Squad[]): Promise<boolean> {
  inMemorySquads = squads;
  try {
    const { error } = await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        key: 'BRK_ESPORTS_SQUADS',
        value: JSON.stringify(squads),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[Squads DB] Failed to save squads:', err);
    return false;
  }
}

/**
 * Retrieves a single squad by ID.
 */
export async function getSquadById(id: string): Promise<Squad | null> {
  const squads = await getSquads();
  return squads.find(s => s.id === id && !s.isDisbanded) || null;
}

/**
 * Retrieves a squad by its unique shareable invite token.
 */
export async function getSquadByInviteToken(token: string): Promise<Squad | null> {
  if (!token) return null;
  const squads = await getSquads();
  return squads.find(s => s.inviteToken === token.trim() && !s.isDisbanded) || null;
}

/**
 * Gets all active squads where the given user is a member (Leader, Player, Manager, Coach).
 */
export async function getUserSquads(userId: string): Promise<Squad[]> {
  if (!userId) return [];
  const squads = await getSquads();
  return squads.filter(s => 
    !s.isDisbanded && 
    Array.isArray(s.members) && 
    s.members.some(m => m.userId === userId && m.status === 'ACTIVE')
  );
}

/**
 * Gets pending invites / requests for a given user.
 */
export async function getUserPendingInvites(userId: string): Promise<{ squad: Squad; member: SquadMember }[]> {
  if (!userId) return [];
  const squads = await getSquads();
  const results: { squad: Squad; member: SquadMember }[] = [];

  for (const s of squads) {
    if (s.isDisbanded || !Array.isArray(s.members)) continue;
    const inv = s.members.find(m => m.userId === userId && m.status === 'INVITED');
    if (inv) {
      results.push({ squad: s, member: inv });
    }
  }

  return results;
}

/**
 * Searches users safely by Username, Account Number (BRE-XXXXXX), or Free Fire UID.
 */
export async function searchPlayers(query: string, currentUserId?: string): Promise<{
  id: string;
  name: string;
  avatar: string;
  accountNumber: string;
  freeFireUid: string;
  inGameName: string;
  isCurrentUser: boolean;
}[]> {
  const q = (query || '').trim().toLowerCase();
  if (!q || q.length < 2) return [];

  try {
    const { data: users } = await supabaseAdmin
      .from('User')
      .select('id, name, avatar, accountNumber, freeFireUid, inGameName, email')
      .or(`name.ilike.%${q}%,accountNumber.ilike.%${q}%,freeFireUid.ilike.%${q}%,inGameName.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10);

    if (users && users.length > 0) {
      return users.map((u: any) => ({
        id: u.id,
        name: u.name || 'Player',
        avatar: u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.name || u.id}`,
        accountNumber: u.accountNumber || `BRE-${u.id.substring(0, 6).toUpperCase()}`,
        freeFireUid: u.freeFireUid || '',
        inGameName: u.inGameName || u.name || 'Player',
        isCurrentUser: u.id === currentUserId,
      }));
    }
  } catch (err) {
    console.warn('[searchPlayers] Supabase error:', err);
  }

  // Memory search fallback
  return [];
}
