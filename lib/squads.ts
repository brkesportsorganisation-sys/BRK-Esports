import { supabaseAdmin } from './supabase';
import { Squad, SquadMember, SquadMemberType, InGameRole, SquadMemberStatus, User } from './types';

// Initial squads store (empty by default - 100% real database driven)
export const INITIAL_SQUADS: Squad[] = [];

let inMemorySquads: Squad[] = [];

/**
 * Strict 1-Squad Policy: Sanitizes squad rosters to ensure every player ID exists in AT MOST 1 squad.
 */
export function sanitizeSquadsRoster(squads: Squad[]): Squad[] {
  if (!Array.isArray(squads)) return [];

  // Map user ID -> squad ID
  const userToSquad = new Map<string, string>();
  const userAccountToSquad = new Map<string, string>();

  // Pass 1: Leaders own their squads (Highest priority)
  for (const s of squads) {
    if (s.isDisbanded) continue;
    if (s.leaderId) {
      userToSquad.set(s.leaderId, s.id);
    }
  }

  // Pass 2: Clean members list per squad (Strip duplicates & multiple memberships)
  for (const s of squads) {
    if (s.isDisbanded || !Array.isArray(s.members)) continue;
    const cleanMembers: SquadMember[] = [];
    const seenUserIds = new Set<string>();

    for (const m of s.members) {
      if (!m || !m.userId) continue;
      if (seenUserIds.has(m.userId)) continue; // avoid duplicate in same squad
      seenUserIds.add(m.userId);

      const assignedSquad = userToSquad.get(m.userId);
      const acctKey = m.accountNumber ? m.accountNumber.trim().toUpperCase() : '';
      const assignedByAcct = acctKey ? userAccountToSquad.get(acctKey) : undefined;

      if (!assignedSquad && !assignedByAcct) {
        // Register this user to this squad
        userToSquad.set(m.userId, s.id);
        if (acctKey) userAccountToSquad.set(acctKey, s.id);
        cleanMembers.push(m);
      } else if (assignedSquad === s.id || assignedByAcct === s.id) {
        cleanMembers.push(m);
      } else {
        // User already belongs to another squad, exclude from this one
        console.log(`[1-Squad Rule] Removed user ${m.userName} (${m.userId}) from squad "${s.name}" (already in squad ${assignedSquad || assignedByAcct})`);
      }
    }

    s.members = cleanMembers;
  }

  return squads;
}

/**
 * Loads all squads from Supabase SiteSetting store or in-memory fallback.
 */
export async function getSquads(): Promise<Squad[]> {
  try {
    const { data } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'EZBD_ESPORTS_SQUADS')
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed)) {
        const sanitized = sanitizeSquadsRoster(parsed);
        inMemorySquads = sanitized;
        return sanitized;
      }
    }
  } catch (err) {
    console.warn('[Squads DB] Supabase fetch notice:', err);
  }

  return inMemorySquads;
}

/**
 * Saves squads list to Supabase with persistent database storage.
 */
export async function saveSquads(squads: Squad[]): Promise<boolean> {
  const sanitized = sanitizeSquadsRoster(squads);
  inMemorySquads = sanitized;
  try {
    const { error } = await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        id: 'setting_squads_data',
        key: 'EZBD_ESPORTS_SQUADS',
        value: JSON.stringify(sanitized),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) {
      console.error('[Squads DB] Supabase save error:', error);
      throw error;
    }
    return true;
  } catch (err) {
    console.warn('[Squads DB] Failed to save squads to Supabase:', err);
    return false;
  }
}

/**
 * Converts a legacy Team record from Supabase to Squad format on the fly.
 */
export async function importLegacyTeamAsSquad(teamId: string): Promise<Squad | null> {
  try {
    const { data: legacyTeam } = await supabaseAdmin
      .from('Team')
      .select('*')
      .eq('id', teamId)
      .maybeSingle();

    if (!legacyTeam) return null;

    const { data: leaderUser } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('id', legacyTeam.captainId)
      .maybeSingle();

    const { data: teamMembers } = await supabaseAdmin
      .from('TeamMember')
      .select(`
        id,
        teamId,
        userId,
        role,
        joinedAt,
        user:User (
          id,
          name,
          inGameName,
          avatar,
          accountNumber,
          freeFireUid
        )
      `)
      .eq('teamId', teamId);

    const members: SquadMember[] = (teamMembers && teamMembers.length > 0)
      ? teamMembers.map((tm: any, idx: number) => {
          const u = tm.user || {};
          const isLeader = tm.userId === legacyTeam.captainId || tm.role === 'CAPTAIN';
          return {
            id: tm.id || `mem_${idx}`,
            squadId: legacyTeam.id,
            userId: tm.userId || leaderUser?.id,
            userName: u.inGameName || u.name || leaderUser?.name || 'Player',
            userAvatar: u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.name || tm.id}`,
            accountNumber: u.accountNumber || `EZBD-${(tm.userId || '').substring(0, 6).toUpperCase()}`,
            freeFireUid: u.freeFireUid || '',
            memberType: 'PLAYER',
            inGameRole: isLeader ? 'IGL' : 'RUSHER',
            isLeader,
            joinedAt: tm.joinedAt || legacyTeam.createdAt,
            status: 'ACTIVE',
          };
        })
      : [
          {
            id: `mem_leader_${legacyTeam.id}`,
            squadId: legacyTeam.id,
            userId: legacyTeam.captainId,
            userName: leaderUser?.inGameName || leaderUser?.name || 'Captain',
            userAvatar: leaderUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${leaderUser?.name || 'Leader'}`,
            accountNumber: leaderUser?.accountNumber || `EZBD-${legacyTeam.captainId.substring(0, 6).toUpperCase()}`,
            freeFireUid: leaderUser?.freeFireUid || '',
            memberType: 'PLAYER',
            inGameRole: 'IGL',
            isLeader: true,
            joinedAt: legacyTeam.createdAt,
            status: 'ACTIVE',
          }
        ];

    const newSquad: Squad = {
      id: legacyTeam.id,
      name: legacyTeam.name,
      tag: legacyTeam.tag,
      logoUrl: legacyTeam.logo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200',
      bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200',
      game: 'FREE_FIRE',
      createdBy: legacyTeam.captainId,
      leaderId: legacyTeam.captainId,
      leaderName: leaderUser?.inGameName || leaderUser?.name || 'Captain',
      description: 'Official registered esports squad roster.',
      requireApprovalToJoin: true,
      inviteToken: legacyTeam.inviteCode || legacyTeam.id,
      matchesPlayed: 0,
      matchesWon: 0,
      totalKills: 0,
      totalEarnings: 0,
      members,
      createdAt: legacyTeam.createdAt,
      updatedAt: legacyTeam.createdAt,
    };

    return newSquad;
  } catch (err) {
    console.warn('[Squads DB] Legacy import error:', err);
    return null;
  }
}

/**
 * Retrieves a single squad by ID.
 */
export async function getSquadById(id: string): Promise<Squad | null> {
  const squads = await getSquads();
  let found = squads.find(s => s.id === id && !s.isDisbanded);
  if (found) return found;

  // Auto-import from legacy Supabase Team table if available
  const imported = await importLegacyTeamAsSquad(id);
  if (imported) {
    squads.push(imported);
    await saveSquads(squads);
    return imported;
  }

  return null;
}

/**
 * Retrieves a squad by its unique shareable invite token.
 */
export async function getSquadByInviteToken(token: string): Promise<Squad | null> {
  if (!token) return null;
  const squads = await getSquads();
  let found = squads.find(s => (s.inviteToken === token.trim() || s.id === token.trim()) && !s.isDisbanded);
  if (found) return found;

  // Check legacy team by inviteCode
  try {
    const { data: legacyTeam } = await supabaseAdmin
      .from('Team')
      .select('id')
      .or(`inviteCode.eq.${token.trim()},id.eq.${token.trim()}`)
      .maybeSingle();

    if (legacyTeam?.id) {
      return getSquadById(legacyTeam.id);
    }
  } catch {}

  return null;
}

/**
 * Gets the single active squad where the given user is a member (Leader, Player, Manager, Coach).
 * Strict 1-Squad Rule: A user can belong to AT MOST 1 active squad at any time.
 */
export async function getUserSquads(userId: string): Promise<Squad[]> {
  if (!userId) return [];
  const squads = await getSquads();
  
  // Also get user profile for exact accountNumber / UID matching
  let userAccountNumber = '';
  let userUid = '';
  try {
    const { data: dbUser } = await supabaseAdmin
      .from('User')
      .select('id, accountNumber, freeFireUid')
      .eq('id', userId)
      .maybeSingle();
    if (dbUser) {
      userAccountNumber = (dbUser.accountNumber || '').trim().toUpperCase();
      userUid = (dbUser.freeFireUid || '').trim();
    }
  } catch {}

  const isUserMember = (m: any) => {
    if (!m) return false;
    if (m.userId === userId || m.id === userId) return true;
    if (userAccountNumber && m.accountNumber && m.accountNumber.toUpperCase() === userAccountNumber) return true;
    if (userUid && m.freeFireUid && m.freeFireUid === userUid) return true;
    return false;
  };

  const isUserLeader = (s: Squad) => {
    return s.leaderId === userId || s.createdBy === userId;
  };

  // Find all matching squads (should be at most 1 due to sanitization)
  const found = squads.filter(s => 
    !s.isDisbanded && 
    (
      isUserLeader(s) ||
      (Array.isArray(s.members) && s.members.some(m => isUserMember(m) && (m.status === 'ACTIVE' || !m.status)))
    )
  );

  if (found.length > 0) {
    // Return the primary squad (prioritize leadership squad if any, else first)
    const leaderSquad = found.find(s => isUserLeader(s));
    return [leaderSquad || found[0]];
  }

  // Fallback: Query Supabase `Team` and `TeamMember` tables directly if not cached
  try {
    const { data: legacyCaptainTeams } = await supabaseAdmin
      .from('Team')
      .select('id')
      .eq('captainId', userId);

    const { data: legacyMemberships } = await supabaseAdmin
      .from('TeamMember')
      .select('teamId')
      .eq('userId', userId);

    const allTeamIds = new Set<string>();
    (legacyCaptainTeams || []).forEach(t => allTeamIds.add(t.id));
    (legacyMemberships || []).forEach(m => allTeamIds.add(m.teamId));

    for (const teamId of allTeamIds) {
      const imported = await getSquadById(teamId);
      if (imported && !imported.isDisbanded) {
        const isLeader = imported.leaderId === userId || imported.createdBy === userId;
        const isActiveMember = Array.isArray(imported.members) && imported.members.some(m => 
          isUserMember(m) && (m.status === 'ACTIVE' || !m.status)
        );
        if (isLeader || isActiveMember) {
          return [imported]; // Return at most 1
        }
      }
    }
  } catch (err) {
    console.warn('[getUserSquads] Supabase direct query notice:', err);
  }

  return [];
}

/**
 * Returns the single active squad a user belongs to (as Leader or Active Member), if any.
 * Supports excluding a specific squad ID (e.g. current squad being checked).
 */
export async function getUserActiveSquad(userId: string, excludeSquadId?: string): Promise<Squad | null> {
  if (!userId) return null;
  const userSquads = await getUserSquads(userId);
  const activeSquad = userSquads.find(s => !s.isDisbanded && (!excludeSquadId || s.id !== excludeSquadId));
  return activeSquad || null;
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
 * Searches users safely by Username, Account Number (EZBD-XXXXXX), or Free Fire UID.
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
        accountNumber: u.accountNumber || `EZBD-${u.id.substring(0, 6).toUpperCase()}`,
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
