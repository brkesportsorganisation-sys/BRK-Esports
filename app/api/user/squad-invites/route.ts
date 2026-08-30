import { NextRequest, NextResponse } from 'next/server';
import { getUserPendingInvites, getSquads, saveSquads } from '@/lib/squads';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ invites: [] });
    }

    const invites = await getUserPendingInvites(userId);
    return NextResponse.json({ invites });
  } catch (error: any) {
    console.error('[GET /api/user/squad-invites]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch squad invites.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, squadId, action } = body; // action: 'ACCEPT' | 'DECLINE'

    if (!userId || !squadId || !action) {
      return NextResponse.json({ message: 'User ID, Squad ID, and action are required.' }, { status: 400 });
    }

    const squads = await getSquads();
    const index = squads.findIndex(s => s.id === squadId && !s.isDisbanded);

    if (index === -1) {
      return NextResponse.json({ message: 'Squad not found.' }, { status: 404 });
    }

    const currentSquad = squads[index];
    const memberIndex = (currentSquad.members || []).findIndex(m => m.userId === userId && m.status === 'INVITED');

    if (memberIndex === -1) {
      return NextResponse.json({ message: 'Invitation not found or already answered.' }, { status: 404 });
    }

    if (action === 'ACCEPT') {
      // Enforce strict 1-squad rule
      const { getUserActiveSquad } = await import('@/lib/squads');
      const otherActiveSquad = await getUserActiveSquad(userId, squadId);

      if (otherActiveSquad) {
        return NextResponse.json({ 
          message: `You are already an active member of squad "[${otherActiveSquad.tag}] ${otherActiveSquad.name}". Please leave your current squad first before joining a new one.`,
          code: 'ALREADY_IN_SQUAD'
        }, { status: 400 });
      }

      currentSquad.members![memberIndex].status = 'ACTIVE';
      currentSquad.members![memberIndex].joinedAt = new Date().toISOString();
    } else {
      currentSquad.members![memberIndex].status = 'REJECTED';
    }

    squads[index] = { ...currentSquad, updatedAt: new Date().toISOString() };
    await saveSquads(squads);

    return NextResponse.json({
      success: true,
      message: action === 'ACCEPT'
        ? `You have joined [${currentSquad.tag}] ${currentSquad.name}!`
        : `Invitation from ${currentSquad.name} declined.`,
      squad: currentSquad,
    });

  } catch (error: any) {
    console.error('[POST /api/user/squad-invites]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process invite.' }, { status: 500 });
  }
}
