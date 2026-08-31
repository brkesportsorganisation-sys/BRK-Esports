import { NextRequest, NextResponse } from 'next/server';
import { getSquadById, getSquads, saveSquads } from '@/lib/squads';
import { supabaseAdmin } from '@/lib/supabase';
import { Squad, SquadMember } from '@/lib/types';

// 1. GET squad details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let squad = await getSquadById(id);

    if (!squad) {
      // Check legacy Team table in Supabase
      const { data: legacyTeam } = await supabaseAdmin
        .from('Team')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (legacyTeam) {
        // Fetch legacy captain & members
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
          .eq('teamId', id);

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

        squad = {
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
      }
    }

    if (!squad) {
      return NextResponse.json({ message: 'Squad not found.' }, { status: 404 });
    }

    return NextResponse.json({ squad });
  } catch (error: any) {
    console.error('[GET /api/squads/[id]]', error);
    return NextResponse.json({ message: error?.message || 'Error fetching squad.' }, { status: 500 });
  }
}

// 2. PATCH update squad
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { 
      requesterId, 
      name, 
      tag, 
      logoUrl, 
      bannerUrl, 
      description, 
      requireApprovalToJoin 
    } = body;

    const squads = await getSquads();
    const index = squads.findIndex(s => s.id === id);

    if (index === -1) {
      return NextResponse.json({ message: 'Squad not found.' }, { status: 404 });
    }

    const current = squads[index];

    // Check permissions: Leader or Manager
    const isLeader = current.leaderId === requesterId;
    const isManager = current.members?.some(m => m.userId === requesterId && m.memberType === 'MANAGER' && m.status === 'ACTIVE');

    if (!isLeader && !isManager) {
      return NextResponse.json({ message: 'Only Squad Leader or Manager can edit squad details.' }, { status: 403 });
    }

    // Process base64 logo/banner if updated
    let finalLogoUrl = current.logoUrl;
    if (logoUrl !== undefined && logoUrl !== null && logoUrl !== '') {
      if (logoUrl.startsWith('data:image/')) {
        try {
          const { saveBase64Image } = await import('@/lib/upload');
          const uploaded = await saveBase64Image(logoUrl, 'squad-logos');
          finalLogoUrl = uploaded || logoUrl;
        } catch (uploadErr) {
          console.warn('[PATCH /api/squads/[id]] Logo upload notice:', uploadErr);
          finalLogoUrl = logoUrl;
        }
      } else {
        finalLogoUrl = logoUrl;
      }
    }

    let finalBannerUrl = current.bannerUrl;
    if (bannerUrl !== undefined && bannerUrl !== null && bannerUrl !== '') {
      if (bannerUrl.startsWith('data:image/')) {
        try {
          const { saveBase64Image } = await import('@/lib/upload');
          const uploaded = await saveBase64Image(bannerUrl, 'squad-banners');
          finalBannerUrl = uploaded || bannerUrl;
        } catch (uploadErr) {
          console.warn('[PATCH /api/squads/[id]] Banner upload notice:', uploadErr);
          finalBannerUrl = bannerUrl;
        }
      } else {
        finalBannerUrl = bannerUrl;
      }
    }

    const updated = {
      ...current,
      name: name?.trim() || current.name,
      tag: tag?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || current.tag,
      logoUrl: finalLogoUrl,
      bannerUrl: finalBannerUrl,
      description: description !== undefined ? description : current.description,
      requireApprovalToJoin: requireApprovalToJoin !== undefined ? requireApprovalToJoin : current.requireApprovalToJoin,
      updatedAt: new Date().toISOString(),
    };

    squads[index] = updated;
    await saveSquads(squads);

    // Sync to Supabase Team table if exists
    try {
      await supabaseAdmin
        .from('Team')
        .update({
          name: updated.name,
          tag: updated.tag,
          logo: updated.logoUrl,
        })
        .eq('id', id);
    } catch (syncErr) {
      console.warn('[PATCH /api/squads/[id]] Supabase Team sync notice:', syncErr);
    }

    return NextResponse.json({ success: true, message: 'Squad updated successfully!', squad: updated });
  } catch (error: any) {
    console.error('[PATCH /api/squads/[id]]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update squad.' }, { status: 500 });
  }
}

// 3. DELETE disband squad
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const requesterId = searchParams.get('userId');

    const squads = await getSquads();
    const index = squads.findIndex(s => s.id === id);

    if (index === -1) {
      return NextResponse.json({ message: 'Squad not found.' }, { status: 404 });
    }

    const current = squads[index];

    // Only the Leader can disband
    if (current.leaderId !== requesterId) {
      return NextResponse.json({ message: 'Only the Squad Leader can disband this squad.' }, { status: 403 });
    }

    squads[index] = {
      ...current,
      isDisbanded: true,
      updatedAt: new Date().toISOString(),
    };

    await saveSquads(squads);

    return NextResponse.json({ success: true, message: 'Squad has been disbanded successfully.' });
  } catch (error: any) {
    console.error('[DELETE /api/squads/[id]]', error);
    return NextResponse.json({ message: error?.message || 'Failed to disband squad.' }, { status: 500 });
  }
}
