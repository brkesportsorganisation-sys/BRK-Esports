import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { fetchWaapiChats, getWhatsAppTargetGroups, saveWhatsAppTargetGroups } from '@/lib/whatsapp';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { instanceId, apiKey } = body;

    const res = await fetchWaapiChats(instanceId, apiKey);
    if (!res.success) {
      return NextResponse.json({
        success: false,
        message: res.message || 'Failed to sync groups from WhatsApp.',
      }, { status: 400 });
    }

    const fetchedGroups = res.groups || [];
    if (fetchedGroups.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Synced ${res.totalChats} chats, but no group chats were found on this WhatsApp account.`,
        groups: await getWhatsAppTargetGroups(),
        syncedCount: 0,
      });
    }

    const currentGroups = await getWhatsAppTargetGroups();
    const existingIds = new Set(currentGroups.map(g => g.identifier));

    let addedCount = 0;
    const merged = [...currentGroups];

    for (const g of fetchedGroups) {
      if (!existingIds.has(g.identifier)) {
        existingIds.add(g.identifier);
        merged.push(g);
        addedCount++;
      } else {
        // Update existing group name / member count
        const idx = merged.findIndex(mg => mg.identifier === g.identifier);
        if (idx !== -1) {
          merged[idx] = {
            ...merged[idx],
            name: g.name,
            memberCount: g.memberCount || merged[idx].memberCount,
          };
        }
      }
    }

    await saveWhatsAppTargetGroups(merged);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${fetchedGroups.length} WhatsApp groups (${addedCount} newly added)!`,
      groups: merged,
      syncedCount: fetchedGroups.length,
      newlyAddedCount: addedCount,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/sync-groups]', error);
    return NextResponse.json({
      success: false,
      message: error?.message || 'Error syncing groups.',
    }, { status: 500 });
  }
}
