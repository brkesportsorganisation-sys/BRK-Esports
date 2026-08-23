import { NextRequest, NextResponse } from 'next/server';
import { getSquads, saveSquads, getUserSquads } from '@/lib/squads';
import { Squad, SquadMember } from '@/lib/types';
import { supabaseAdmin } from '@/lib/supabase';

// Helper to get authenticated user
async function getAuthUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data } = await supabaseAdmin.auth.getUser(token);
      if (data?.user) {
        const { data: dbUser } = await supabaseAdmin
          .from('User')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();
        return dbUser || { id: data.user.id, name: data.user.email?.split('@')[0], email: data.user.email };
      }
    }
  } catch {}
  return null;
}

// 1. GET squads
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const game = searchParams.get('game');
    const search = searchParams.get('search')?.toLowerCase();

    if (userId) {
      const userSquads = await getUserSquads(userId);
      return NextResponse.json({ squads: userSquads });
    }

    let allSquads = await getSquads();
    allSquads = allSquads.filter(s => !s.isDisbanded);

    if (game && game !== 'ALL') {
      allSquads = allSquads.filter(s => s.game === game);
    }

    if (search) {
      allSquads = allSquads.filter(s => 
        s.name.toLowerCase().includes(search) || 
        s.tag.toLowerCase().includes(search) ||
        (s.description && s.description.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({ squads: allSquads });
  } catch (error: any) {
    console.error('[GET /api/squads]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch squads.' }, { status: 500 });
  }
}

// 2. POST create squad
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      name, 
      tag, 
      game = 'FREE_FIRE', 
      logoUrl, 
      bannerUrl, 
      description,
      leaderId,
      leaderName,
      leaderAccountNumber,
      leaderUid
    } = body;

    if (!name?.trim() || !tag?.trim() || !leaderId) {
      return NextResponse.json({ message: 'Squad name, tag code, and leader are required.' }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanTag = tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (cleanTag.length < 2 || cleanTag.length > 6) {
      return NextResponse.json({ message: 'Squad tag must be 2 to 6 characters (e.g. BRK, NV, ALPH).' }, { status: 400 });
    }

    const squads = await getSquads();

    // Check unique name and tag per game (spec requirement)
    const duplicate = squads.find(s => 
      !s.isDisbanded && 
      s.game === game && 
      (s.name.toLowerCase() === cleanName.toLowerCase() || s.tag.toUpperCase() === cleanTag)
    );

    if (duplicate) {
      return NextResponse.json({ 
        message: `A squad with this name or tag already exists for ${game}. Please choose a unique name and tag.` 
      }, { status: 409 });
    }

    // Check one active squad per game rule (spec recommendation)
    const existingUserSquad = squads.find(s => 
      !s.isDisbanded && 
      s.game === game && 
      Array.isArray(s.members) && 
      s.members.some(m => m.userId === leaderId && m.status === 'ACTIVE')
    );

    if (existingUserSquad) {
      return NextResponse.json({ 
        message: `You are already an active member of "${existingUserSquad.name}" for ${game}. You can only lead or belong to one active squad per game.` 
      }, { status: 400 });
    }

    const squadId = `squad_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const inviteToken = `tok_${cleanTag.toLowerCase()}_${Date.now().toString(36)}`;

    const initialLeaderMember: SquadMember = {
      id: `mem_${Date.now()}_1`,
      squadId,
      userId: leaderId,
      userName: leaderName || 'Leader',
      userAvatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${leaderName || leaderId}`,
      accountNumber: leaderAccountNumber || `BRE-${leaderId.substring(0, 6).toUpperCase()}`,
      freeFireUid: leaderUid || '',
      memberType: 'PLAYER',
      inGameRole: 'IGL', // Default leader role
      isLeader: true,
      joinedAt: new Date().toISOString(),
      status: 'ACTIVE',
    };

    const newSquad: Squad = {
      id: squadId,
      name: cleanName,
      tag: cleanTag,
      logoUrl: logoUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200',
      bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200',
      game,
      createdBy: leaderId,
      leaderId,
      leaderName: leaderName || 'Leader',
      description: description?.trim() || '',
      requireApprovalToJoin: true,
      inviteToken,
      matchesPlayed: 0,
      matchesWon: 0,
      totalKills: 0,
      totalEarnings: 0,
      members: [initialLeaderMember],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    squads.unshift(newSquad);
    await saveSquads(squads);

    // Sync to Supabase Team & TeamMember tables for complete cross-compatibility
    try {
      await supabaseAdmin.from('Team').insert({
        id: squadId,
        name: cleanName,
        tag: cleanTag,
        logo: newSquad.logoUrl,
        captainId: leaderId,
        captainName: leaderName || 'Leader',
        membersCount: 1,
        wins: 0,
        inviteCode: inviteToken,
        createdAt: newSquad.createdAt,
      });

      await supabaseAdmin.from('TeamMember').insert({
        id: initialLeaderMember.id,
        teamId: squadId,
        userId: leaderId,
        role: 'CAPTAIN',
        joinedAt: initialLeaderMember.joinedAt,
      });
    } catch (syncErr) {
      console.warn('[POST /api/squads] Supabase Team table sync notice:', syncErr);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Squad "[${newSquad.tag}] ${newSquad.name}" created successfully!`,
      squad: newSquad 
    }, { status: 201 });

  } catch (error: any) {
    console.error('[POST /api/squads]', error);
    return NextResponse.json({ message: error?.message || 'Failed to create squad.' }, { status: 500 });
  }
}
