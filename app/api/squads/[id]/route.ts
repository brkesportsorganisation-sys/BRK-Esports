import { NextRequest, NextResponse } from 'next/server';
import { getSquadById, getSquads, saveSquads } from '@/lib/squads';
import { supabaseAdmin } from '@/lib/supabase';
import { Squad, SquadMember } from '@/lib/types';

// 1. GET squad details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const squad = await getSquadById(id, true);

    if (!squad) {
      return NextResponse.json({ message: 'Squad not found.' }, { status: 404 });
    }

    return NextResponse.json(
      { squad },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
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
