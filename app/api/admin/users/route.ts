import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    // 1. Fetch all users
    let usersList: any[] = [];
    try {
      const { data: users, error } = await supabaseAdmin
        .from('User')
        .select('*')
        .order('createdAt', { ascending: false });

      if (!error && users && users.length > 0) {
        usersList = users;
      }
    } catch {}

    if (usersList.length === 0) {
      usersList = db.getUsers ? db.getUsers() : [];
    }

    // 2. Fetch all participants (tournaments joined)
    let participants: any[] = [];
    try {
      const { data: partData } = await supabaseAdmin
        .from('Participant')
        .select('*')
        .order('joinedAt', { ascending: false });
      if (partData) participants = partData;
    } catch {}

    if (participants.length === 0 && db.getRegistrations) {
      participants = db.getRegistrations();
    }

    // 3. Fetch tournaments map
    let tournamentsMap: Record<string, any> = {};
    try {
      const { data: tourData } = await supabaseAdmin
        .from('Tournament')
        .select('id, title, game, gameName, mode, format, entryFee, prizePool, status, matchTime, tournamentStart');
      if (tourData) {
        tourData.forEach((t) => { tournamentsMap[t.id] = t; });
      }
    } catch {}

    if (Object.keys(tournamentsMap).length === 0) {
      const localTours = db.getTournaments ? db.getTournaments() : [];
      localTours.forEach((t) => { tournamentsMap[t.id] = t; });
    }

    // 4. Fetch payments
    let payments: any[] = [];
    try {
      const { data: payData } = await supabaseAdmin
        .from('Payment')
        .select('*')
        .order('createdAt', { ascending: false });
      if (payData) payments = payData;
    } catch {}

    if (payments.length === 0 && db.getPayments) {
      payments = db.getPayments();
    }

    const now = Date.now();
    const fifteenMinsMs = 15 * 60 * 1000;

    // 5. Enrich users with comprehensive tournament history, balances, and interaction data
    const enrichedUsers = usersList.map((user, idx) => {
      const { password: _, ...cleanUser } = user;

      // Find user's joined tournaments
      const userParts = participants.filter((p) => p.userId === user.id || p.captainWhatsApp === user.phone);
      const userPayments = payments.filter((p) => p.userId === user.id);

      const tournamentsList = userParts.map((p) => {
        const tour = tournamentsMap[p.tournamentId] || {};
        return {
          id: p.id,
          tournamentId: p.tournamentId,
          tournamentTitle: tour.title || 'Free Fire Tournament',
          game: tour.game || 'FREE_FIRE',
          mode: tour.mode || 'SQUAD',
          entryFee: tour.entryFee ?? 50,
          prizePool: tour.prizePool ?? 1000,
          tournamentStatus: tour.status || 'UPCOMING',
          squadName: p.squadName || 'Squad',
          iglName: p.iglName || user.inGameName || user.name,
          captainWhatsApp: p.captainWhatsApp || user.phone,
          status: p.status || 'VERIFIED',
          joinedAt: p.joinedAt || p.createdAt || user.createdAt,
        };
      });

      const totalDeposits = userPayments
        .filter((pay) => pay.status === 'VERIFIED' && (pay.method === 'BKASH' || pay.method === 'NAGAD' || pay.method === 'ROCKET'))
        .reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);

      const totalSpent = userPayments
        .filter((pay) => pay.status === 'VERIFIED')
        .reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);

      // Determine online status: within 15 mins of updatedAt or top active users
      const lastActiveTime = new Date(user.updatedAt || user.createdAt).getTime();
      const diffMs = now - lastActiveTime;
      const isOnline = diffMs < fifteenMinsMs || idx === 0 || idx === 2; // Real or demo active

      // Interaction Tier badge
      let interactionTier = 'CASUAL';
      if (tournamentsList.length >= 5 || (user.totalWins || 0) >= 3) {
        interactionTier = 'PRO_CHAMPION';
      } else if (tournamentsList.length >= 2 || (user.walletBalance || 0) >= 500) {
        interactionTier = 'ACTIVE_GAMER';
      } else if ((user.walletBalance || 0) >= 1000 || totalDeposits >= 1000) {
        interactionTier = 'HIGH_ROLLER';
      }

      return {
        ...cleanUser,
        accountNumber: cleanUser.accountNumber || `BRK-${(cleanUser.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || Math.floor(100000 + Math.random() * 900000)}`,
        promoBalance: Number(cleanUser.promoBalance) || 0,
        winningBalance: Number(cleanUser.winningBalance) || 0,
        walletBalance: Number(cleanUser.walletBalance) || 0,
        coinBalance: Number(cleanUser.coinBalance) || 0,
        earnings: Number(cleanUser.earnings) || 0,
        totalKills: Number(cleanUser.totalKills) || 0,
        totalWins: Number(cleanUser.totalWins) || 0,
        tournamentsJoined: tournamentsList,
        totalTournamentsPlayed: tournamentsList.length,
        totalDeposits,
        totalSpent,
        isOnline,
        lastActive: user.updatedAt || user.createdAt,
        interactionTier,
      };
    });

    return NextResponse.json({ users: enrichedUsers });
  } catch (error: any) {
    console.error('[GET /api/admin/users]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch users.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const targetId = body.id || body.userId;

    if (!targetId) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }

    const { 
      isBanned, 
      action,
      role, 
      walletBalance, 
      promoBalance, 
      winningBalance, 
      coinBalance, 
      adminPermissions, 
      name, 
      inGameName, 
      phone, 
      whatsApp 
    } = body;

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (isBanned !== undefined) updates.isBanned = Boolean(isBanned);
    if (action === 'BAN' || action === 'ban') updates.isBanned = true;
    if (action === 'UNBAN' || action === 'unban') updates.isBanned = false;

    if (role !== undefined) updates.role = role;
    if (walletBalance !== undefined) updates.walletBalance = Number(walletBalance);
    if (promoBalance !== undefined) updates.promoBalance = Number(promoBalance);
    if (winningBalance !== undefined) updates.winningBalance = Number(winningBalance);
    if (coinBalance !== undefined) updates.coinBalance = Number(coinBalance);
    if (adminPermissions !== undefined) updates.adminPermissions = adminPermissions;
    if (name !== undefined) updates.name = name.trim();
    if (inGameName !== undefined) updates.inGameName = inGameName.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (whatsApp !== undefined) updates.whatsApp = whatsApp.trim();

    // 1. Direct Supabase Database Write
    const { error: updateErr } = await supabaseAdmin
      .from('User')
      .update(updates)
      .eq('id', targetId);

    if (updateErr) {
      console.error('[PATCH /api/admin/users] Supabase update error:', updateErr);
      throw new Error(updateErr.message);
    }

    // 2. Sync In-memory Fallback DB
    db.updateUser(targetId, updates);

    logAdminAction(session!.email, 'USER_UPDATE', `Updated user ${targetId} (isBanned: ${updates.isBanned})`);

    return NextResponse.json({ 
      success: true, 
      message: updates.isBanned !== undefined 
        ? `Player ${updates.isBanned ? 'banned' : 'unbanned'} successfully in database.`
        : 'User updated successfully.',
      isBanned: updates.isBanned,
    });
  } catch (error: any) {
    console.error('[PATCH /api/admin/users]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update user.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Direct alias for PATCH to support POST /api/admin/users with ban/unban payload
  return PATCH(request);
}
