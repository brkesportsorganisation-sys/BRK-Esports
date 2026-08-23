import { NextRequest, NextResponse } from 'next/server';
import { getSquads, saveSquads, getSquadById } from '@/lib/squads';

// 1. GET invite link token info
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const squad = await getSquadById(id);

    if (!squad || squad.isDisbanded) {
      return NextResponse.json({ message: 'Squad not found.' }, { status: 404 });
    }

    return NextResponse.json({
      token: squad.inviteToken,
      inviteUrl: `${req.nextUrl.origin}/squad/join/${squad.inviteToken}`,
      requireApproval: squad.requireApprovalToJoin,
    });
  } catch (error: any) {
    console.error('[GET /api/squads/[id]/invite-link]', error);
    return NextResponse.json({ message: error?.message || 'Error fetching invite link.' }, { status: 500 });
  }
}

// 2. POST regenerate / toggle invite link
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { requesterId, action } = body; // action: 'REGENERATE' | 'TOGGLE_APPROVAL'

    let squads = await getSquads();
    let index = squads.findIndex(s => s.id === id);

    if (index === -1) {
      const imported = await getSquadById(id);
      if (imported) {
        squads = await getSquads();
        index = squads.findIndex(s => s.id === id);
      }
    }

    if (index === -1) {
      return NextResponse.json({ message: 'Squad not found.' }, { status: 404 });
    }

    const current = squads[index];
    const isLeader = current.leaderId === requesterId;
    const isManager = current.members?.some(m => m.userId === requesterId && m.memberType === 'MANAGER' && m.status === 'ACTIVE');

    if (!isLeader && !isManager) {
      return NextResponse.json({ message: 'Only Squad Leader or Manager can manage invite links.' }, { status: 403 });
    }

    if (action === 'REGENERATE') {
      const newToken = `tok_${current.tag.toLowerCase()}_${Date.now().toString(36)}`;
      squads[index] = {
        ...current,
        inviteToken: newToken,
        updatedAt: new Date().toISOString(),
      };
      await saveSquads(squads);

      return NextResponse.json({
        success: true,
        message: 'New invite link generated! Old links are now revoked.',
        token: newToken,
        inviteUrl: `${req.nextUrl.origin}/squad/join/${newToken}`,
      });
    }

    return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[POST /api/squads/[id]/invite-link]', error);
    return NextResponse.json({ message: error?.message || 'Failed to manage invite link.' }, { status: 500 });
  }
}
