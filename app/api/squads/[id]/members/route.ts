import { NextRequest, NextResponse } from 'next/server';
import { getSquads, saveSquads, getSquadById } from '@/lib/squads';
import { SquadMember, SquadMemberType, InGameRole, SquadMemberStatus } from '@/lib/types';
import { supabaseAdmin } from '@/lib/supabase';

// 1. POST add or invite member to squad
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { 
      requesterId, 
      targetUserId, 
      targetUserName, 
      targetUserAvatar, 
      targetAccountNumber, 
      targetFreeFireUid,
      memberType = 'PLAYER', 
      inGameRole = 'RUSHER',
      isJoinRequest = false
    } = body;

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

    const currentSquad = squads[index];
    if (currentSquad.isDisbanded) {
      return NextResponse.json({ message: 'This squad is disbanded.' }, { status: 400 });
    }

    // Verify requester permission if sending an invite
    if (!isJoinRequest) {
      const isLeader = currentSquad.leaderId === requesterId;
      const isManager = currentSquad.members?.some(m => m.userId === requesterId && m.memberType === 'MANAGER' && m.status === 'ACTIVE');

      if (!isLeader && !isManager) {
        return NextResponse.json({ message: 'Only Squad Leader or Manager can invite new players.' }, { status: 403 });
      }
    }

    // Check if target is already in this squad
    const existingMember = currentSquad.members?.find(m => m.userId === targetUserId);
    if (existingMember) {
      if (existingMember.status === 'ACTIVE') {
        return NextResponse.json({ message: 'Player is already an active member of this squad.' }, { status: 400 });
      } else if (existingMember.status === 'INVITED') {
        return NextResponse.json({ message: 'Player has already been invited.' }, { status: 400 });
      } else if (existingMember.status === 'PENDING_APPROVAL') {
        return NextResponse.json({ message: 'Player already has a pending join request.' }, { status: 400 });
      }
    }

    // Check max roster size (e.g. max 6 players per squad)
    const activePlayerCount = (currentSquad.members || []).filter(m => m.status === 'ACTIVE' && m.memberType === 'PLAYER').length;
    if (memberType === 'PLAYER' && activePlayerCount >= 6) {
      return NextResponse.json({ message: 'Squad player roster is full (maximum 6 active players allowed).' }, { status: 400 });
    }

    // Determine initial status:
    // If invited by Leader -> 'INVITED'
    // If requested to join by player -> if requireApprovalToJoin is false -> 'ACTIVE', else 'PENDING_APPROVAL'
    let status: SquadMemberStatus = 'INVITED';
    if (isJoinRequest) {
      status = currentSquad.requireApprovalToJoin ? 'PENDING_APPROVAL' : 'ACTIVE';
    }

    const newMember: SquadMember = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      squadId: id,
      userId: targetUserId,
      userName: targetUserName || 'Player',
      userAvatar: targetUserAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUserName || targetUserId}`,
      accountNumber: targetAccountNumber || `EZBD-${targetUserId.substring(0, 6).toUpperCase()}`,
      freeFireUid: targetFreeFireUid || '',
      memberType: memberType as SquadMemberType,
      inGameRole: inGameRole as InGameRole,
      isLeader: false,
      joinedAt: new Date().toISOString(),
      status,
      invitedBy: requesterId,
    };

    const updatedMembers = (currentSquad.members || []).filter(m => m.userId !== targetUserId);
    updatedMembers.push(newMember);

    squads[index] = {
      ...currentSquad,
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    };

    await saveSquads(squads);

    const successMsg = isJoinRequest
      ? (status === 'ACTIVE' ? 'You joined the squad successfully!' : 'Join request sent to Squad Leader for approval!')
      : `Invitation sent to ${targetUserName}!`;

    return NextResponse.json({ success: true, message: successMsg, member: newMember });

  } catch (error: any) {
    console.error('[POST /api/squads/[id]/members]', error);
    return NextResponse.json({ message: error?.message || 'Failed to add member.' }, { status: 500 });
  }
}

// 2. PATCH update member role, status (approve/reject), or promote
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { 
      requesterId, 
      memberId, 
      action, // 'UPDATE_ROLE' | 'PROMOTE_LEADER' | 'APPROVE_REQUEST' | 'REJECT_REQUEST' | 'ACCEPT_INVITE' | 'DECLINE_INVITE'
      inGameRole, 
      memberType 
    } = body;

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

    const currentSquad = squads[index];
    const memberIndex = (currentSquad.members || []).findIndex(m => m.id === memberId || m.userId === memberId);

    if (memberIndex === -1) {
      return NextResponse.json({ message: 'Squad member not found.' }, { status: 404 });
    }

    const targetMember = currentSquad.members![memberIndex];
    const isLeader = currentSquad.leaderId === requesterId;
    const isManager = currentSquad.members?.some(m => m.userId === requesterId && m.memberType === 'MANAGER' && m.status === 'ACTIVE');

    // 1. Accept or Decline Invite (by the invited player themselves)
    if (action === 'ACCEPT_INVITE' || action === 'DECLINE_INVITE') {
      if (targetMember.userId !== requesterId) {
        return NextResponse.json({ message: 'You can only accept or decline your own invitations.' }, { status: 403 });
      }

      if (action === 'ACCEPT_INVITE') {
        // Enforce 1 active squad per game rule
        const otherActiveSquad = squads.find(s => 
          s.id !== id && 
          !s.isDisbanded && 
          s.game === currentSquad.game && 
          s.members?.some(m => m.userId === requesterId && m.status === 'ACTIVE')
        );

        if (otherActiveSquad) {
          return NextResponse.json({ 
            message: `You are already an active member of "${otherActiveSquad.name}" for ${currentSquad.game}. Please leave that squad first before joining a new one.` 
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
        message: action === 'ACCEPT_INVITE' ? `You have joined [${currentSquad.tag}] ${currentSquad.name}!` : 'Invitation declined.',
        squad: currentSquad 
      });
    }

    // 2. Approve or Reject Join Request (Leader / Manager only)
    if (action === 'APPROVE_REQUEST' || action === 'REJECT_REQUEST') {
      if (!isLeader && !isManager) {
        return NextResponse.json({ message: 'Only Squad Leader or Manager can approve join requests.' }, { status: 403 });
      }

      if (action === 'APPROVE_REQUEST') {
        currentSquad.members![memberIndex].status = 'ACTIVE';
        currentSquad.members![memberIndex].joinedAt = new Date().toISOString();
      } else {
        currentSquad.members![memberIndex].status = 'REJECTED';
      }

      squads[index] = { ...currentSquad, updatedAt: new Date().toISOString() };
      await saveSquads(squads);

      return NextResponse.json({ 
        success: true, 
        message: action === 'APPROVE_REQUEST' ? `Approved ${targetMember.userName} to join the squad!` : `Request from ${targetMember.userName} rejected.`,
        squad: currentSquad 
      });
    }

    // 3. Promote to Leader (Leader only)
    if (action === 'PROMOTE_LEADER') {
      if (!isLeader) {
        return NextResponse.json({ message: 'Only the current Squad Leader can transfer leadership.' }, { status: 403 });
      }

      // Demote current leader
      const oldLeaderIdx = currentSquad.members!.findIndex(m => m.userId === requesterId);
      if (oldLeaderIdx >= 0) {
        currentSquad.members![oldLeaderIdx].isLeader = false;
      }

      // Promote new leader
      currentSquad.members![memberIndex].isLeader = true;
      currentSquad.leaderId = targetMember.userId;
      currentSquad.leaderName = targetMember.userName;

      squads[index] = { ...currentSquad, updatedAt: new Date().toISOString() };
      await saveSquads(squads);

      return NextResponse.json({ 
        success: true, 
        message: `Squad Leadership transferred to ${targetMember.userName}!`,
        squad: currentSquad 
      });
    }

    // 4. Update Member In-Game Role or Member Type (Leader / Manager only)
    if (action === 'UPDATE_ROLE') {
      if (!isLeader && !isManager) {
        return NextResponse.json({ message: 'Only Squad Leader or Manager can change player roles.' }, { status: 403 });
      }

      if (inGameRole) currentSquad.members![memberIndex].inGameRole = inGameRole;
      if (memberType) currentSquad.members![memberIndex].memberType = memberType;

      squads[index] = { ...currentSquad, updatedAt: new Date().toISOString() };
      await saveSquads(squads);

      return NextResponse.json({ 
        success: true, 
        message: `Role updated for ${targetMember.userName}!`,
        squad: currentSquad 
      });
    }

    return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });

  } catch (error: any) {
    console.error('[PATCH /api/squads/[id]/members]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update member.' }, { status: 500 });
  }
}

// 3. DELETE remove member / leave squad
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const requesterId = searchParams.get('userId');
    const memberId = searchParams.get('memberId');

    if (!requesterId || !memberId) {
      return NextResponse.json({ message: 'Requester ID and Member ID are required.' }, { status: 400 });
    }

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

    const currentSquad = squads[index];
    const targetMember = currentSquad.members?.find(m => m.id === memberId || m.userId === memberId);

    if (!targetMember) {
      return NextResponse.json({ message: 'Member not found.' }, { status: 404 });
    }

    const isSelf = targetMember.userId === requesterId;
    const isLeader = currentSquad.leaderId === requesterId;
    const isManager = currentSquad.members?.some(m => m.userId === requesterId && m.memberType === 'MANAGER' && m.status === 'ACTIVE');

    // If removing someone else, must be Leader or Manager (cannot kick Leader)
    if (!isSelf) {
      if (!isLeader && !isManager) {
        return NextResponse.json({ message: 'Only Squad Leader or Manager can remove members.' }, { status: 403 });
      }
      if (targetMember.isLeader) {
        return NextResponse.json({ message: 'The Squad Leader cannot be kicked. Leadership must be transferred first.' }, { status: 400 });
      }
    } else {
      // If leader is leaving, must transfer leadership first
      if (targetMember.isLeader) {
        const otherActiveMembers = (currentSquad.members || []).filter(m => m.userId !== requesterId && m.status === 'ACTIVE');
        if (otherActiveMembers.length > 0) {
          return NextResponse.json({ message: 'As the Squad Leader, you must transfer leadership to another member before leaving, or disband the squad.' }, { status: 400 });
        }
      }
    }

    // Remove from roster
    currentSquad.members = (currentSquad.members || []).filter(m => m.id !== memberId && m.userId !== memberId);
    squads[index] = { ...currentSquad, updatedAt: new Date().toISOString() };
    await saveSquads(squads);

    const msg = isSelf ? 'You have left the squad.' : `${targetMember.userName} was removed from the squad.`;
    return NextResponse.json({ success: true, message: msg, squad: currentSquad });

  } catch (error: any) {
    console.error('[DELETE /api/squads/[id]/members]', error);
    return NextResponse.json({ message: error?.message || 'Failed to remove member.' }, { status: 500 });
  }
}
