import { supabaseAdmin } from './supabase';
import { Squad, SquadMember, SquadMemberType, InGameRole, SquadMemberStatus, User } from './types';

// Initial squads store (empty by default - 100% real database driven)
export const INITIAL_SQUADS: Squad[] = [];

let inMemorySquads: Squad[] = [];

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
      if (Array.isArray(parsed)) {
        inMemorySquads = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Squads DB] Supabase fetch notice:', err);
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
