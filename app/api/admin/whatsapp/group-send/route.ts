import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { 
  sendGroupWhatsappMessage, 
  getWhatsAppTargetGroups, 
  getWhatsAppSchedules, 
  saveWhatsAppSchedules, 
  calculateNextRunTime,
  executeScheduledJob 
} from '@/lib/whatsapp';
import { WhatsAppSchedule } from '@/lib/types';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

/**
 * POST /api/admin/whatsapp/group-send
 * 
 * 1. Instant Group Message Dispatch:
 * {
 *   "groupId": "120363028392819283@g.us", // or group link or phone or saved group id
 *   "groupName": "Tournament Elite Group",
 *   "message": "🔥 Match starting in 15 minutes! Room ID & Pass available now: https://brkesports.com"
 * }
 * 
 * 2. Automated Scheduled Group Broadcast:
 * {
 *   "groupId": "120363028392819283@g.us",
 *   "groupName": "Tournament Elite Group",
 *   "message": "⏰ Match registration alert #{COUNT} of {MAX_COUNT}!",
 *   "schedule": {
 *     "title": "Evening Group Reminder",
 *     "frequency": "INTERVAL_MINUTES",
 *     "intervalMinutes": 30,
 *     "maxExecutions": 5, // Will send exactly 5 times and then stop automatically
 *     "messagesSequence": [ // optional rotating message sequence
 *       "📢 Alert 1: Registration open! 50 slots left.",
 *       "📢 Alert 2: 25 slots left! Join fast.",
 *       "📢 Alert 3: Last 5 slots! Registration closing soon."
 *     ]
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { groupId, groupJid, groupDestination, groupName, message, schedule } = body;

    const rawDestination = groupDestination || groupJid || groupId;
    if (!rawDestination) {
      return NextResponse.json(
        { message: 'Group identifier/JID or Group ID is required (e.g. 1203630xxxx@g.us).' },
        { status: 400 }
      );
    }

    // Resolve destination if a saved group ID or name was passed
    const groups = await getWhatsAppTargetGroups();
    const cleanRaw = rawDestination.trim().toLowerCase();
    const matchedGroup = groups.find(
      g => g.id === rawDestination || 
           g.identifier === rawDestination || 
           g.name?.toLowerCase() === cleanRaw ||
           (g.name && cleanRaw.includes(g.name.toLowerCase()))
    );

    let resolvedDestination = matchedGroup?.identifier || rawDestination;
    const resolvedName = groupName || matchedGroup?.name || 'WhatsApp Group';

    // If resolved destination looks like an internal DB ID (e.g. grp_120363426443362477_g_us)
    if (resolvedDestination.startsWith('grp_') && resolvedDestination.includes('_g_us')) {
      const extracted = resolvedDestination.replace('grp_', '').replace('_g_us', '@g.us');
      resolvedDestination = extracted;
    }

    const messageText = typeof message === 'string' ? message.trim() : '';

    // ==========================================
    // Option A: Create a Scheduled Group Routine
    // ==========================================
    if (schedule && typeof schedule === 'object') {
      const scheduleTitle = schedule.title || `${resolvedName} Automation`;
      const template = messageText || (Array.isArray(schedule.messagesSequence) && schedule.messagesSequence[0]) || '';
      
      if (!template) {
        return NextResponse.json({ message: 'Message text or messagesSequence is required for scheduling.' }, { status: 400 });
      }

      const maxExecutions = Number(schedule.maxExecutions) > 0 ? Number(schedule.maxExecutions) : undefined;
      const intervalMinutes = Number(schedule.intervalMinutes) || 60;
      const frequency = schedule.frequency || (schedule.intervalMinutes ? 'INTERVAL_MINUTES' : 'EVERY_1_HOUR');

      const newId = `sched_grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newSchedule: WhatsAppSchedule = {
        id: newId,
        title: scheduleTitle,
        description: `Automated group broadcast to ${resolvedName}. Repeats every ${intervalMinutes} min. Limit: ${maxExecutions || 'Unlimited'}.`,
        targetType: 'GROUP',
        targetDestination: resolvedDestination,
        targetName: resolvedName,
        messageType: schedule.messagesSequence ? 'ROTATIONAL' : 'TEMPLATE',
        messageTemplate: template,
        messagesSequence: Array.isArray(schedule.messagesSequence) ? schedule.messagesSequence : undefined,
        maxExecutions,
        frequency,
        intervalMinutes,
        scheduledTime: schedule.scheduledTime || '20:00',
        scheduledDate: schedule.scheduledDate,
        isActive: true,
        status: 'ACTIVE',
        runCount: 0,
        nextRunAt: calculateNextRunTime({ frequency, intervalMinutes, scheduledTime: schedule.scheduledTime } as any),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const allSchedules = await getWhatsAppSchedules();
      allSchedules.unshift(newSchedule);
      await saveWhatsAppSchedules(allSchedules);

      // If requested to also send the first message immediately
      if (schedule.sendImmediateFirst) {
        await executeScheduledJob(newSchedule);
      }

      await logAdminAction(
        session?.sub || session?.email || 'admin',
        'CREATE_GROUP_SCHEDULE',
        `Created group schedule for ${resolvedName} (Every ${intervalMinutes}m, Max ${maxExecutions || 'Unlimited'} sends)`,
        'WHATSAPP'
      );

      return NextResponse.json({
        success: true,
        message: `Group schedule created successfully! Will send every ${intervalMinutes} min (Total: ${maxExecutions ? maxExecutions + ' times' : 'Unlimited'}).`,
        schedule: newSchedule,
      });
    }

    // ==========================================
    // Option B: Instant Direct Group Dispatch
    // ==========================================
    if (!messageText) {
      return NextResponse.json({ message: 'Message content is required.' }, { status: 400 });
    }

    const sendResult = await sendGroupWhatsappMessage({
      groupDestination: resolvedDestination,
      text: messageText,
      targetName: resolvedName,
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { success: false, message: sendResult.message, error: (sendResult as any).error },
        { status: 400 }
      );
    }

    await logAdminAction(
      session?.sub || session?.email || 'admin',
      'SEND_GROUP_WHATSAPP',
      `Sent direct message to group: ${resolvedName} (${resolvedDestination})`,
      'WHATSAPP'
    );

    return NextResponse.json({
      success: true,
      message: `Message dispatched successfully to group "${resolvedName}"!`,
      response: (sendResult as any).response || (sendResult as any).data,
    });

  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/group-send]', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to dispatch group message.' },
      { status: 500 }
    );
  }
}
