import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { getSquads, saveSquads } from '@/lib/squads';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

// 1. GET all squads for admin
export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const squads = await getSquads();
    const activeSquads = squads.filter(s => !s.isDisbanded);
    const totalMembers = activeSquads.reduce((acc, s) => acc + (s.members?.filter(m => m.status === 'ACTIVE').length || 0), 0);

    return NextResponse.json({
      squads: activeSquads,
      stats: {
        totalSquads: activeSquads.length,
        totalMembers,
        freeFireSquads: activeSquads.filter(s => s.game === 'FREE_FIRE').length,
        valorantSquads: activeSquads.filter(s => s.game === 'VALORANT').length,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/admin/squads]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch admin squads.' }, { status: 500 });
  }
}

// 2. PATCH moderate squad
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { squadId, action, name, tag, logoUrl, isDisbanded } = body;

    if (!squadId) {
      return NextResponse.json({ message: 'Squad ID is required.' }, { status: 400 });
    }

    const squads = await getSquads();
    const index = squads.findIndex(s => s.id === squadId);

    if (index === -1) {
      return NextResponse.json({ message: 'Squad not found.' }, { status: 404 });
    }

    const current = squads[index];

    if (action === 'DISBAND') {
      squads[index] = {
        ...current,
        isDisbanded: true,
        updatedAt: new Date().toISOString(),
      };
      await saveSquads(squads);
      await logAdminAction(session?.sub || session?.email || 'admin', 'DISBAND_SQUAD', `Disbanded squad: [${current.tag}] ${current.name}`);
      return NextResponse.json({ success: true, message: `Squad ${current.name} was disbanded by admin.` });
    }

    // Moderate / Edit info
    const updated = {
      ...current,
      name: name?.trim() || current.name,
      tag: tag?.trim().toUpperCase() || current.tag,
      logoUrl: logoUrl || current.logoUrl,
      isDisbanded: isDisbanded !== undefined ? isDisbanded : current.isDisbanded,
      updatedAt: new Date().toISOString(),
    };

    squads[index] = updated;
    await saveSquads(squads);

    await logAdminAction(session?.sub || session?.email || 'admin', 'MODERATE_SQUAD', `Updated squad: [${updated.tag}] ${updated.name}`);
    return NextResponse.json({ success: true, message: 'Squad updated by admin.', squad: updated });

  } catch (error: any) {
    console.error('[PATCH /api/admin/squads]', error);
    return NextResponse.json({ message: error?.message || 'Failed to moderate squad.' }, { status: 500 });
  }
}
