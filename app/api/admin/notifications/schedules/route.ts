import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateAINotification, dispatchNotificationToDatabase } from '@/lib/ai-notification';
import { NotificationSchedule } from '@/lib/types';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

// Fallback helper to get schedules from SiteSetting if table is not yet created
async function getSchedulesFromStore(): Promise<NotificationSchedule[]> {
  try {
    const { data: tableData, error: tableErr } = await supabaseAdmin
      .from('NotificationSchedule')
      .select('*')
      .order('createdAt', { ascending: false });

    if (!tableErr && tableData) {
      return tableData;
    }
  } catch {}

  // Fallback to SiteSetting
  try {
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'AI_NOTIFICATION_SCHEDULES')
      .maybeSingle();

    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {}

  return [];
}

// Fallback helper to save schedules to SiteSetting
async function saveSchedulesToSettingStore(schedules: NotificationSchedule[]) {
  try {
    await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        key: 'AI_NOTIFICATION_SCHEDULES',
        value: JSON.stringify(schedules),
        description: 'Automated AI Notification Bot Schedules',
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });
  } catch (e) {
    console.error('Failed to save to SiteSetting fallback:', e);
  }
}

// 1. GET all AI Notification Schedules
export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const schedules = await getSchedulesFromStore();
    return NextResponse.json({ schedules });
  } catch (error: any) {
    console.error('Error fetching notification schedules:', error);
    return NextResponse.json({ schedules: [] });
  }
}

// 2. POST create a new AI Notification Schedule
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      name,
      prompt,
      category = 'GENERAL',
      targetAudience = 'ALL',
      tournamentId,
      intervalMinutes = 60,
      imageUrl,
      actionLink,
      isActive = true,
      triggerImmediately = false,
    } = body;

    if (!name || !prompt) {
      return NextResponse.json({ message: 'Schedule name and prompt are required.' }, { status: 400 });
    }

    const interval = Math.max(10, parseInt(String(intervalMinutes), 10) || 60);
    const now = new Date();
    const nextRun = new Date(now.getTime() + interval * 60000);

    const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const schedulePayload: NotificationSchedule = {
      id: scheduleId,
      name: name.trim(),
      prompt: prompt.trim(),
      category,
      targetAudience,
      tournamentId: tournamentId || undefined,
      intervalMinutes: interval,
      imageUrl: imageUrl?.trim() || undefined,
      actionLink: actionLink?.trim() || undefined,
      isActive: Boolean(isActive),
      lastRunAt: triggerImmediately ? now.toISOString() : undefined,
      nextRunAt: nextRun.toISOString(),
      totalDispatched: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    let tableSaved = false;
    try {
      const { error: insertErr } = await supabaseAdmin
        .from('NotificationSchedule')
        .insert([schedulePayload]);
      if (!insertErr) tableSaved = true;
    } catch {}

    // Fallback store in SiteSetting if table is missing
    if (!tableSaved) {
      const current = await getSchedulesFromStore();
      await saveSchedulesToSettingStore([schedulePayload, ...current]);
    }

    let dispatchResult: any = null;
    if (triggerImmediately) {
      // Execute immediate run
      const aiGen = await generateAINotification({
        prompt: prompt.trim(),
        category,
      });

      dispatchResult = await dispatchNotificationToDatabase({
        title: aiGen.title,
        message: aiGen.message,
        type: aiGen.category,
        priority: aiGen.priority,
        link: actionLink || aiGen.suggestedActionLink,
        imageUrl: imageUrl || aiGen.suggestedImageUrl,
        targetAudience: targetAudience as any,
        tournamentId: tournamentId || undefined,
      });

      if (dispatchResult.success) {
        schedulePayload.totalDispatched = dispatchResult.dispatchedCount;
        schedulePayload.lastRunAt = now.toISOString();
        if (tableSaved) {
          await supabaseAdmin
            .from('NotificationSchedule')
            .update({
              totalDispatched: dispatchResult.dispatchedCount,
              lastRunAt: now.toISOString(),
            })
            .eq('id', scheduleId);
        } else {
          const current = await getSchedulesFromStore();
          const updated = current.map(s => s.id === scheduleId ? schedulePayload : s);
          await saveSchedulesToSettingStore(updated);
        }
      }
    }

    await logAdminAction(
      session?.username || 'admin',
      'CREATE_NOTIFICATION_SCHEDULE',
      'NotificationSchedule',
      scheduleId,
      `Created AI schedule "${name}" (Interval: ${interval}m)`
    );

    return NextResponse.json({
      success: true,
      schedule: schedulePayload,
      dispatchResult,
      message: 'AI Notification Schedule created successfully!',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/admin/notifications/schedules] Error:', error);
    return NextResponse.json({ message: error?.message || 'Failed to create schedule.' }, { status: 500 });
  }
}

// 3. PATCH update or toggle active state
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, triggerNow, ...updates } = body;

    if (!id) {
      return NextResponse.json({ message: 'Schedule ID is required.' }, { status: 400 });
    }

    const currentSchedules = await getSchedulesFromStore();
    const schedule = currentSchedules.find(s => s.id === id);

    if (!schedule) {
      return NextResponse.json({ message: 'Schedule not found.' }, { status: 404 });
    }

    // Trigger immediate cycle manually
    if (triggerNow) {
      const aiGen = await generateAINotification({
        prompt: schedule.prompt,
        category: schedule.category,
      });

      const dispatchResult = await dispatchNotificationToDatabase({
        title: aiGen.title,
        message: aiGen.message,
        type: aiGen.category,
        priority: aiGen.priority,
        link: schedule.actionLink || aiGen.suggestedActionLink,
        imageUrl: schedule.imageUrl || aiGen.suggestedImageUrl,
        targetAudience: schedule.targetAudience as any,
        tournamentId: schedule.tournamentId || undefined,
      });

      const now = new Date();
      const nextRun = new Date(now.getTime() + (schedule.intervalMinutes || 60) * 60000);

      const updatedSched = {
        ...schedule,
        lastRunAt: now.toISOString(),
        nextRunAt: nextRun.toISOString(),
        totalDispatched: (schedule.totalDispatched || 0) + (dispatchResult.dispatchedCount || 0),
        updatedAt: now.toISOString(),
      };

      try {
        await supabaseAdmin
          .from('NotificationSchedule')
          .update(updatedSched)
          .eq('id', id);
      } catch {}

      const updatedList = currentSchedules.map(s => s.id === id ? updatedSched : s);
      await saveSchedulesToSettingStore(updatedList);

      return NextResponse.json({
        success: true,
        dispatchResult,
        generated: aiGen,
        message: `AI notification triggered! Sent to ${dispatchResult.dispatchedCount} players.`,
      });
    }

    // General update
    const updatedSched = {
      ...schedule,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    try {
      await supabaseAdmin
        .from('NotificationSchedule')
        .update(updatedSched)
        .eq('id', id);
    } catch {}

    const updatedList = currentSchedules.map(s => s.id === id ? updatedSched : s);
    await saveSchedulesToSettingStore(updatedList);

    return NextResponse.json({ success: true, schedule: updatedSched, message: 'Schedule updated successfully.' });
  } catch (error: any) {
    console.error('[PATCH /api/admin/notifications/schedules] Error:', error);
    return NextResponse.json({ message: error?.message || 'Failed to update schedule.' }, { status: 500 });
  }
}

// 4. DELETE schedule
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Schedule ID is required.' }, { status: 400 });
    }

    try {
      await supabaseAdmin
        .from('NotificationSchedule')
        .delete()
        .eq('id', id);
    } catch {}

    const currentSchedules = await getSchedulesFromStore();
    const updatedList = currentSchedules.filter(s => s.id !== id);
    await saveSchedulesToSettingStore(updatedList);

    return NextResponse.json({ success: true, message: 'Schedule deleted successfully.' });
  } catch (error: any) {
    console.error('[DELETE /api/admin/notifications/schedules] Error:', error);
    return NextResponse.json({ message: error?.message || 'Failed to delete schedule.' }, { status: 500 });
  }
}
