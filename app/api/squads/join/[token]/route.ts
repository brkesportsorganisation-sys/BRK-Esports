import { NextRequest, NextResponse } from 'next/server';
import { getSquadByInviteToken, getSquads, saveSquads } from '@/lib/squads';
import { SquadMember } from '@/lib/types';

// 1. GET preview squad by invite token
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const squad = await getSquadByInviteToken(token);

    if (!squad || squad.isDisbanded) {
      return NextResponse.json({ message: 'Invalid, expired, or revoked squad invite link.' }, { status: 404 });
    }

    const activeMembers = (squad.members || []).filter(m => m.status === 'ACTIVE');

    return NextResponse.json({
      squad: {
        id: squad.id,
        name: squad.name,
        tag: squad.tag,
        logoUrl: squad.logoUrl,
        bannerUrl: squad.bannerUrl,
        game: squad.game,
        leaderName: squad.leaderName,
        description: squad.description,
        requireApprovalToJoin: squad.requireApprovalToJoin,
        memberCount: activeMembers.length,
        members: activeMembers.map(m => ({
          userName: m.userName,
          userAvatar: m.userAvatar,
          memberType: m.memberType,
          inGameRole: m.inGameRole,
          isLeader: m.isLeader,
        })),
        matchesPlayed: squad.matchesPlayed,
        matchesWon: squad.matchesWon,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/squads/join/[token]]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch squad preview.' }, { status: 500 });
  }
}

// 2. POST join squad using invite token
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { userId, userName, userAvatar, accountNumber, freeFireUid, preferredRole = 'RUSHER' } = body;

    if (!userId) {
      return NextResponse.json({ message: 'Authentication required to join squad.' }, { status: 401 });
    }

    const squads = await getSquads();
    const index = squads.findIndex(s => s.inviteToken === token && !s.isDisbanded);

    if (index === -1) {
      return NextResponse.json({ message: 'Invalid or revoked squad invite link.' }, { status: 404 });
    }

    const currentSquad = squads[index];

    // Check strict 1-squad rule: player cannot be in any other active squad
    const { getUserActiveSquad } = await import('@/lib/squads');
    const otherActiveSquad = await getUserActiveSquad(userId, currentSquad.id);

    if (otherActiveSquad) {
      return NextResponse.json({ 
        message: `You are already an active member of squad "[${otherActiveSquad.tag}] ${otherActiveSquad.name}". You cannot belong to multiple squads simultaneously. Please leave your current squad first.`,
        code: 'ALREADY_IN_SQUAD',
        existingSquad: { id: otherActiveSquad.id, name: otherActiveSquad.name, tag: otherActiveSquad.tag }
      }, { status: 400 });
    }

    // Check if already in this squad
    const existing = currentSquad.members?.find(m => m.userId === userId);
    if (existing?.status === 'ACTIVE') {
      return NextResponse.json({ message: 'You are already an active member of this squad!' }, { status: 400 });
    }
    if (existing?.status === 'PENDING_APPROVAL') {
      return NextResponse.json({ message: 'Your join request is already pending approval with the Squad Leader.' }, { status: 400 });
    }

    const status = currentSquad.requireApprovalToJoin ? 'PENDING_APPROVAL' : 'ACTIVE';

    const newMember: SquadMember = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      squadId: currentSquad.id,
      userId,
      userName: userName || 'Player',
      userAvatar: userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userName || userId}`,
      accountNumber: accountNumber || `EZBD-${userId.substring(0, 6).toUpperCase()}`,
      freeFireUid: freeFireUid || '',
      memberType: 'PLAYER',
      inGameRole: preferredRole,
      isLeader: false,
      joinedAt: new Date().toISOString(),
      status,
    };

    const updatedMembers = (currentSquad.members || []).filter(m => m.userId !== userId);
    updatedMembers.push(newMember);

    squads[index] = {
      ...currentSquad,
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    };

    await saveSquads(squads);

    return NextResponse.json({
      success: true,
      status,
      message: status === 'ACTIVE'
        ? `Congratulations! You have joined [${currentSquad.tag}] ${currentSquad.name}!`
        : `Your join request was submitted to Squad Leader for approval!`,
      squadId: currentSquad.id,
    });

  } catch (error: any) {
    console.error('[POST /api/squads/join/[token]]', error);
    return NextResponse.json({ message: error?.message || 'Failed to join squad.' }, { status: 500 });
  }
}
