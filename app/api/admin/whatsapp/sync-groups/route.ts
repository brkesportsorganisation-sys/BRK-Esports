import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { getWhatsAppSettings, getWhatsAppTargetGroups, saveWhatsAppTargetGroups } from '@/lib/whatsapp';
import { WhatsAppTargetGroup } from '@/lib/types';

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
    const settings = await getWhatsAppSettings();

    // Node Bot mode: fetch groups from Render backend
    if (settings.provider === 'NODE_BOT' && settings.nodeBotUrl && settings.nodeBotSecret) {
      const host = settings.nodeBotUrl.replace(/\/+$/, '');
      const res = await fetch(`${host}/api/get-groups`, {
        headers: { 'x-api-secret': settings.nodeBotSecret },
        signal: AbortSignal.timeout(15000),
      }).catch(() => null);

      if (!res || !res.ok) {
        return NextResponse.json({
          success: false,
          message: res
            ? `Node Bot returned ${res.status}. Is the Render app running?`
            : 'Could not reach the Node Bot (Render). Is the server sleeping? Wait 30s and try again.',
          syncedGroups: [],
        }, { status: 503 });
      }

      const data = await res.json().catch(() => ({}));
      const rawGroups: Array<{ id: string; name: string; participants?: number }> = data.groups || [];

      if (rawGroups.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'Node Bot is connected but no groups found. Make sure your WhatsApp number is a member of the target groups.',
          syncedGroups: [],
        });
      }

      // Map to WhatsAppTargetGroup format
      const mapped: WhatsAppTargetGroup[] = rawGroups.map((g) => ({
        id: `grp_${g.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: g.name,
        category: g.name.toLowerCase().includes('scrim')
          ? 'SCRIMS_VIP'
          : g.name.toLowerCase().includes('tour') || g.name.toLowerCase().includes('tournament')
          ? 'TOURNAMENT_MAIN'
          : 'GENERAL',
        identifier: g.id,
        description: `Synced from Node Bot (${g.participants || 0} participants)`,
        memberCount: g.participants || 0,
        createdAt: new Date().toISOString(),
      }));

      // Merge with existing groups (don't overwrite manually added ones)
      const existing = await getWhatsAppTargetGroups();
      const existingIds = new Set(existing.map((g) => g.identifier));

      const toAdd = mapped.filter((g) => !existingIds.has(g.identifier));
      const merged = [...existing, ...toAdd];
      await saveWhatsAppTargetGroups(merged);

      return NextResponse.json({
        success: true,
        message: `Synced ${toAdd.length} new group(s) from Node Bot. Total: ${merged.length} group(s).`,
        syncedGroups: mapped,
        totalGroups: merged.length,
      });
    }

    // For other providers, return info message
    return NextResponse.json({
      success: true,
      message: `Group sync via API is only available in NODE_BOT mode. Current provider: ${settings.provider}. Please add groups manually.`,
      syncedGroups: [],
    });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/sync-groups]', error);
    return NextResponse.json({ message: 'Failed to sync groups', error: error?.message }, { status: 500 });
  }
}
