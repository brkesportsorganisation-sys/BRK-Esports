import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { fetchWaapiChats, fetchGreenApiChats, getWhatsAppSettings, getWhatsAppTargetGroups, saveWhatsAppTargetGroups } from '@/lib/whatsapp';

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
    const settings = await getWhatsAppSettings();
    const activeProvider = body.provider || settings.provider;

    let res: any;
    if (activeProvider === 'GREEN_API' || activeProvider === 'DIRECT_QR') {
      res = await fetchGreenApiChats(
        body.apiUrl || settings.greenApiUrl,
        body.instanceId || settings.greenApiInstanceId,
        body.apiKey || settings.greenApiToken
      );
    } else if (activeProvider === 'WAAPI') {
      res = await fetchWaapiChats(
        body.instanceId || settings.waapiInstanceId,
        body.apiKey || settings.waapiApiKey
      );
    } else {
      res = await fetchGreenApiChats(
        body.apiUrl || settings.greenApiUrl,
        body.instanceId || settings.greenApiInstanceId,
        body.apiKey || settings.greenApiToken
      );
    }

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
    const existingByIdentifier = new Map(currentGroups.map(g => [g.identifier, g]));

    let addedCount = 0;
    let fixedCount = 0;
    const merged = [...currentGroups];

    for (const fetchedGroup of fetchedGroups) {
      const jid = fetchedGroup.identifier; // This is a real @g.us JID
      
      if (existingByIdentifier.has(jid)) {
        // Update existing group name / member count
        const idx = merged.findIndex(mg => mg.identifier === jid);
        if (idx !== -1) {
          merged[idx] = {
            ...merged[idx],
            name: fetchedGroup.name || merged[idx].name,
            memberCount: fetchedGroup.memberCount || merged[idx].memberCount,
          };
        }
      } else {
        // Check if any existing group has an invite link but same name → fix it with real JID
        const matchByName = merged.findIndex(mg =>
          (mg.identifier.includes('chat.whatsapp.com/') || mg.identifier.includes('whatsapp.com/channel/')) &&
          mg.name.toLowerCase().trim() === fetchedGroup.name.toLowerCase().trim()
        );

        if (matchByName !== -1) {
          // Replace invite link with real @g.us JID
          merged[matchByName] = {
            ...merged[matchByName],
            identifier: jid,
            name: fetchedGroup.name || merged[matchByName].name,
            memberCount: fetchedGroup.memberCount || merged[matchByName].memberCount,
          };
          fixedCount++;
        } else {
          // Genuinely new group — add it
          merged.push(fetchedGroup);
          addedCount++;
        }
      }
    }

    await saveWhatsAppTargetGroups(merged);

    const fixedMsg = fixedCount > 0 ? ` (${fixedCount}টি group-এর invite link → @g.us JID-এ আপডেট হয়েছে!)` : '';

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${fetchedGroups.length} WhatsApp groups (${addedCount} নতুন added)${fixedMsg}`,
      groups: merged,
      syncedCount: fetchedGroups.length,
      newlyAddedCount: addedCount,
      fixedCount,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/sync-groups]', error);
    return NextResponse.json({
      success: false,
      message: error?.message || 'Error syncing groups.',
    }, { status: 500 });
  }
}
