import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { 
  getWhatsAppSchedules, 
  saveWhatsAppSchedules, 
  getWhatsAppTargetGroups, 
  saveWhatsAppTargetGroups,
  getWhatsAppLogs, 
  calculateNextRunTime, 
  executeScheduledJob,
  runAllDueWhatsAppSchedules
} from '@/lib/whatsapp';
import { WhatsAppSchedule } from '@/lib/types';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

// 1. GET all schedules, groups, logs
export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    // Non-blocking background runner
    void runAllDueWhatsAppSchedules().catch(() => {});

    const [schedules, groups, logs] = await Promise.all([
      getWhatsAppSchedules().catch(() => []),
      getWhatsAppTargetGroups().catch(() => []),
      getWhatsAppLogs().catch(() => []),
    ]);

    const activeCount = schedules.filter(s => s.status === 'ACTIVE' && s.isActive).length;
    const totalExecutions = schedules.reduce((sum, s) => sum + (s.runCount || 0), 0);

    return NextResponse.json({
      schedules,
      groups,
      logs,
      stats: {
        totalSchedules: schedules.length,
        activeSchedules: activeCount,
        totalExecutions,
        totalGroups: groups.length,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/admin/whatsapp/scheduler]', error);
    return NextResponse.json({ message: 'Failed to fetch scheduler data' }, { status: 500 });
  }
}

// 2. POST create a new WhatsApp schedule or target group
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, schedule, group } = body;

    // Action 1: Create Group
    if (action === 'CREATE_GROUP' && group) {
      if (!group.name || !group.identifier) {
        return NextResponse.json({ message: 'Group name and identifier/link are required.' }, { status: 400 });
      }

      const groups = await getWhatsAppTargetGroups();
      const newGroup = {
        id: `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: group.name.trim(),
        category: group.category || 'CUSTOM',
        identifier: group.identifier.trim(),
        description: group.description?.trim() || '',
        memberCount: group.memberCount || 0,
        createdAt: new Date().toISOString(),
      };

      groups.push(newGroup);
      await saveWhatsAppTargetGroups(groups);

      return NextResponse.json({ success: true, message: 'WhatsApp Group added successfully!', group: newGroup });
    }

    // Action 2: Create Automation Schedule
    if (!schedule || !schedule.title || !schedule.messageTemplate || !schedule.targetDestination) {
      return NextResponse.json({ message: 'Title, message template, and target destination are required.' }, { status: 400 });
    }

    const schedules = await getWhatsAppSchedules();
    const newId = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const maxExecutions = Number(schedule.maxExecutions) > 0 ? Number(schedule.maxExecutions) : undefined;
    const messagesSequence = Array.isArray(schedule.messagesSequence) && schedule.messagesSequence.length > 0
      ? schedule.messagesSequence.map((m: string) => m.trim()).filter(Boolean)
      : undefined;

    const newSchedule: WhatsAppSchedule = {
      id: newId,
      title: schedule.title.trim(),
      description: schedule.description?.trim() || '',
      targetType: schedule.targetType || 'GROUP',
      targetDestination: schedule.targetDestination.trim(),
      targetName: schedule.targetName?.trim() || 'WhatsApp Target',
      messageType: schedule.messageType || (messagesSequence ? 'ROTATIONAL' : 'TEMPLATE'),
      messageTemplate: schedule.messageTemplate.trim(),
      imageUrl: schedule.imageUrl?.trim() || schedule.mediaUrl?.trim() || undefined,
      mediaUrl: schedule.imageUrl?.trim() || schedule.mediaUrl?.trim() || undefined,
      messagesSequence,
      messagesMode: schedule.messagesMode || (messagesSequence ? 'ROTATIONAL' : 'SINGLE'),
      maxExecutions,
      frequency: schedule.frequency || 'EVERY_1_HOUR',
      intervalMinutes: Number(schedule.intervalMinutes) || 60,
      scheduledTime: schedule.scheduledTime || '20:00',
      scheduledDate: schedule.scheduledDate || undefined,
      activeDays: schedule.activeDays || ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      activeStartTime: schedule.activeStartTime || '00:00',
      activeEndTime: schedule.activeEndTime || '23:59',
      isActive: schedule.isActive !== false,
      status: schedule.isActive !== false ? 'ACTIVE' : 'PAUSED',
      runCount: 0,
      nextRunAt: (schedule.frequency === 'DAILY' || schedule.frequency === 'ONCE')
        ? calculateNextRunTime(schedule)
        : new Date().toISOString(), // Immediate first run for intervals
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    schedules.unshift(newSchedule);
    await saveWhatsAppSchedules(schedules);

    // If interval or immediate execution is requested, dispatch the first run immediately!
    let firstExecResult: any = null;
    if (schedule.frequency !== 'DAILY' && schedule.frequency !== 'ONCE') {
      try {
        firstExecResult = await executeScheduledJob(newSchedule);
      } catch (err: any) {
        console.warn('[First Schedule Run Error]', err?.message);
      }
    }

    const updatedSchedules = await getWhatsAppSchedules();
    const finalSchedule = updatedSchedules.find(s => s.id === newId) || newSchedule;

    await logAdminAction(session?.sub || session?.email || 'admin', 'CREATE_WHATSAPP_SCHEDULE', `Created schedule: ${newSchedule.title} (Limit: ${maxExecutions || 'Unlimited'})`);

    return NextResponse.json({
      success: true,
      message: firstExecResult?.success
        ? `Schedule created & 1st message dispatched instantly to ${firstExecResult.sentCount || 1} target(s)!`
        : 'Automated WhatsApp schedule created successfully!',
      schedule: finalSchedule,
      firstExecution: firstExecResult,
    });

  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/scheduler]', error);
    return NextResponse.json({ message: error?.message || 'Failed to create schedule' }, { status: 500 });
  }
}

// 3. PATCH update or trigger a schedule
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, scheduleId, updates } = body;

    if (!scheduleId) {
      return NextResponse.json({ message: 'Schedule ID is required' }, { status: 400 });
    }

    const schedules = await getWhatsAppSchedules();
    const index = schedules.findIndex(s => s.id === scheduleId);

    if (index === -1) {
      return NextResponse.json({ message: 'Schedule not found' }, { status: 404 });
    }

    const current = schedules[index];

    // Sub-Action: Trigger "RUN_NOW"
    if (action === 'RUN_NOW') {
      const execResult = await executeScheduledJob(current);
      return NextResponse.json({
        success: execResult.success,
        message: execResult.message,
        sentCount: execResult.sentCount,
      });
    }

    // Sub-Action: Toggle Pause / Resume
    if (action === 'TOGGLE_STATUS') {
      const newStatus = current.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      const newIsActive = newStatus === 'ACTIVE';
      schedules[index] = {
        ...current,
        status: newStatus,
        isActive: newIsActive,
        nextRunAt: newIsActive ? calculateNextRunTime(current) : undefined,
        updatedAt: new Date().toISOString(),
      };
      await saveWhatsAppSchedules(schedules);

      return NextResponse.json({
        success: true,
        message: `Schedule ${newStatus === 'ACTIVE' ? 'resumed' : 'paused'} successfully!`,
        schedule: schedules[index],
      });
    }

    // Sub-Action: Standard Update
    schedules[index] = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await saveWhatsAppSchedules(schedules);

    return NextResponse.json({
      success: true,
      message: 'Schedule updated successfully',
      schedule: schedules[index],
    });
  } catch (error: any) {
    console.error('[PATCH /api/admin/whatsapp/scheduler]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update schedule' }, { status: 500 });
  }
}

// 4. DELETE a schedule or group
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get('id');
    const groupId = searchParams.get('groupId');
    const isClearLogs = searchParams.get('clearLogs') === 'true';

    if (isClearLogs) {
      const { clearWhatsAppLogs } = await import('@/lib/whatsapp');
      await clearWhatsAppLogs();
      return NextResponse.json({ success: true, message: 'All WhatsApp logs cleared successfully' });
    }

    if (groupId) {
      const groups = await getWhatsAppTargetGroups();
      const filtered = groups.filter(g => g.id !== groupId);
      await saveWhatsAppTargetGroups(filtered);
      return NextResponse.json({ success: true, message: 'Group removed successfully' });
    }

    if (!scheduleId) {
      return NextResponse.json({ message: 'Schedule ID is required' }, { status: 400 });
    }

    const schedules = await getWhatsAppSchedules();
    const filtered = schedules.filter(s => s.id !== scheduleId);
    await saveWhatsAppSchedules(filtered);

    return NextResponse.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/admin/whatsapp/scheduler]', error);
    return NextResponse.json({ message: error?.message || 'Failed to delete' }, { status: 500 });
  }
}
