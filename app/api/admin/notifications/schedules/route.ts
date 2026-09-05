import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateAINotification, dispatchNotificationToDatabase } from '@/lib/ai-notification';
import { NotificationSchedule } from '@/lib/types';
import { serverCache, CACHE_TTL } from '@/lib/server-cache';

const SCHEDULES_CACHE_KEY = 'admin:notification-schedules';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

// Helper to get schedules: tries table first, falls back to SiteSetting ONLY on table failure
async function getSchedulesFromStore(): Promise<NotificationSchedule[]> {
  const schedulesMap = new Map<string, NotificationSchedule>();

  // 1. Try reading from NotificationSchedule table (primary source)
  let tableOk = false;
  try {
    const { data: tableData, error: tableErr } = await supabaseAdmin
      .from('NotificationSchedule')
      .select('*')
      .order('createdAt', { ascending: false });

    if (!tableErr && Array.isArray(tableData)) {
      tableOk = true;
      for (const item of tableData) {
        if (item?.id) schedulesMap.set(item.id, item);
      }
    }
  } catch (err) {
    console.warn('[getSchedulesFromStore] table query warning:', err);
  }

  // 2. Only fall back to SiteSetting when table query failed (saves 1 DB query per request)
  if (!tableOk) {
    try {
      const { data: setting, error: settingErr } = await supabaseAdmin
        .from('SiteSetting')
        .select('value')
        .eq('key', 'AI_NOTIFICATION_SCHEDULES')
        .maybeSingle();

      if (!settingErr && setting?.value) {
        const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item?.id && !schedulesMap.has(item.id)) {
              schedulesMap.set(item.id, item);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[getSchedulesFromStore] SiteSetting query warning:', err);
    }
  }

  return Array.from(schedulesMap.values());
}

// Fallback helper to save schedules to SiteSetting
async function saveSchedulesToSettingStore(schedules: NotificationSchedule[]) {
  try {
    const { error } = await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        id: 'setting_AI_NOTIFICATION_SCHEDULES',
        key: 'AI_NOTIFICATION_SCHEDULES',
        value: JSON.stringify(schedules),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) {
      console.error('[saveSchedulesToSettingStore] error:', error);
    }
  } catch (e) {
    console.error('[saveSchedulesToSettingStore] fatal exception:', e);
  }
}

// 1. GET all AI Notification Schedules
export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    // Return from cache if available
    const cached = serverCache.get<NotificationSchedule[]>(SCHEDULES_CACHE_KEY);
    if (cached) {
      return NextResponse.json({ schedules: cached });
    }

    const schedules = await getSchedulesFromStore();
    serverCache.set(SCHEDULES_CACHE_KEY, schedules, CACHE_TTL.NOTIFICATION_SCHEDULES);
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
      naturalPrompt,
      category = 'GENERAL',
      targetAudience = 'ALL',
      tournamentId,
      intervalMinutes = 60,
      startTime,
      endTime,
      maxRuns,
      specificTimes,
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
    const startIso = startTime ? new Date(startTime).toISOString() : now.toISOString();
    const nextRun = triggerImmediately ? new Date(now.getTime() + interval * 60000) : new Date(startIso);

    const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const schedulePayload: NotificationSchedule = {
      id: scheduleId,
      name: name.trim(),
      prompt: prompt.trim(),
      naturalPrompt: naturalPrompt?.trim() || undefined,
      category,
      targetAudience,
      tournamentId: tournamentId || undefined,
      intervalMinutes: interval,
      startTime: startTime ? new Date(startTime).toISOString() : undefined,
      endTime: endTime ? new Date(endTime).toISOString() : undefined,
      maxRuns: maxRuns ? parseInt(String(maxRuns), 10) : undefined,
      specificTimes: Array.isArray(specificTimes) ? specificTimes : undefined,
      imageUrl: imageUrl?.trim() || undefined,
      actionLink: actionLink?.trim() || undefined,
      isActive: Boolean(isActive),
      lastRunAt: triggerImmediately ? now.toISOString() : undefined,
      nextRunAt: nextRun.toISOString(),
      totalDispatched: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // 1. Always save to SiteSetting fallback store to guarantee persistence
    const current = await getSchedulesFromStore();
    const updatedSchedules = [schedulePayload, ...current.filter(s => s.id !== schedulePayload.id)];
    await saveSchedulesToSettingStore(updatedSchedules);

    // 2. Also try inserting into NotificationSchedule table if exists
    let tableSaved = false;
    try {
      const { error: insertErr } = await supabaseAdmin
        .from('NotificationSchedule')
        .upsert([schedulePayload]);
      if (!insertErr) tableSaved = true;
    } catch {}

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
          try {
            await supabaseAdmin
              .from('NotificationSchedule')
              .update({
                totalDispatched: dispatchResult.dispatchedCount,
                lastRunAt: now.toISOString(),
              })
              .eq('id', scheduleId);
          } catch {}
        }
        const updated = updatedSchedules.map(s => s.id === scheduleId ? schedulePayload : s);
        await saveSchedulesToSettingStore(updated);
      }
    }

    await logAdminAction(
      session?.username || 'admin',
      'CREATE_NOTIFICATION_SCHEDULE',
      'NotificationSchedule',
      scheduleId,
      `Created AI schedule "${name}" (Interval: ${interval}m)`
    );

    // Invalidate cache so next GET returns fresh schedules
    serverCache.invalidate(SCHEDULES_CACHE_KEY);

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

      // Invalidate cache after trigger
      serverCache.invalidate(SCHEDULES_CACHE_KEY);

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

    // Invalidate cache
    serverCache.invalidate(SCHEDULES_CACHE_KEY);

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

    // Invalidate cache
    serverCache.invalidate(SCHEDULES_CACHE_KEY);

    return NextResponse.json({ success: true, message: 'Schedule deleted successfully.' });
  } catch (error: any) {
    console.error('[DELETE /api/admin/notifications/schedules] Error:', error);
    return NextResponse.json({ message: error?.message || 'Failed to delete schedule.' }, { status: 500 });
  }
}
