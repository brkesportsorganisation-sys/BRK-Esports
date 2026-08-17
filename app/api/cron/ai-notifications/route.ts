import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateAINotification, dispatchNotificationToDatabase } from '@/lib/ai-notification';

/**
 * Cron / Automation runner for AI Scheduled Notifications
 * Can be called by Vercel Cron, GitHub Actions, or periodic background intervals
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Optional secret check if configured in environment
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const url = new URL(req.url);
      const key = url.searchParams.get('key');
      if (key !== cronSecret) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
    }

    const now = new Date();

    // 1. Fetch active schedules that are due (nextRunAt <= now OR nextRunAt IS NULL)
    let allActiveSchedules: any[] = [];
    try {
      const { data: dueSchedules, error } = await supabaseAdmin
        .from('NotificationSchedule')
        .select('*')
        .eq('isActive', true);

      if (!error && dueSchedules) {
        allActiveSchedules = dueSchedules;
      }
    } catch {}

    if (allActiveSchedules.length === 0) {
      // Check SiteSetting fallback
      try {
        const { data: setting } = await supabaseAdmin
          .from('SiteSetting')
          .select('value')
          .eq('key', 'AI_NOTIFICATION_SCHEDULES')
          .maybeSingle();

        if (setting?.value) {
          const parsed = JSON.parse(setting.value);
          if (Array.isArray(parsed)) {
            allActiveSchedules = parsed.filter(s => s.isActive);
          }
        }
      } catch {}
    }

    const schedulesToProcess = (allActiveSchedules || []).filter(sched => {
      // 1. Check if startTime has arrived
      if (sched.startTime && new Date(sched.startTime).getTime() > now.getTime()) {
        return false;
      }
      // 2. Check if endTime has expired
      if (sched.endTime && new Date(sched.endTime).getTime() < now.getTime()) {
        return false;
      }
      // 3. Check if maxRuns reached
      if (sched.maxRuns && (sched.totalDispatched || 0) >= sched.maxRuns) {
        return false;
      }
      // 4. Check due time
      if (!sched.nextRunAt) return true;
      return new Date(sched.nextRunAt).getTime() <= now.getTime();
    });

    const executionResults: any[] = [];

    for (const schedule of schedulesToProcess) {
      try {
        // Fetch tournament context if linked
        let tournamentContext: any = {};
        if (schedule.tournamentId) {
          const { data: tour } = await supabaseAdmin
            .from('Tournament')
            .select('title, prizePool, entryFee, maxTeams, registeredCount')
            .eq('id', schedule.tournamentId)
            .maybeSingle();

          if (tour) {
            tournamentContext = {
              tournamentTitle: tour.title,
              prizePool: tour.prizePool,
              entryFee: tour.entryFee,
              openSlots: Math.max(0, (tour.maxTeams || 0) - (tour.registeredCount || 0)),
            };
          }
        }

        // Generate AI copy
        const aiGen = await generateAINotification({
          prompt: schedule.prompt,
          category: schedule.category,
          ...tournamentContext,
        });

        // Dispatch to database
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

        const newTotal = (schedule.totalDispatched || 0) + 1;
        const nextRun = new Date(now.getTime() + (schedule.intervalMinutes || 60) * 60000);
        
        // Deactivate if maxRuns reached or endTime passed
        const shouldDeactivate = 
          (schedule.maxRuns && newTotal >= schedule.maxRuns) ||
          (schedule.endTime && nextRun.getTime() > new Date(schedule.endTime).getTime());

        // Update schedule record
        try {
          await supabaseAdmin
            .from('NotificationSchedule')
            .update({
              lastRunAt: now.toISOString(),
              nextRunAt: nextRun.toISOString(),
              totalDispatched: newTotal,
              isActive: !shouldDeactivate,
              updatedAt: now.toISOString(),
            })
            .eq('id', schedule.id);
        } catch {}

        executionResults.push({
          scheduleId: schedule.id,
          name: schedule.name,
          status: 'SUCCESS',
          dispatchedCount: dispatchResult.dispatchedCount,
          generated: aiGen,
        });
      } catch (scheduleErr: any) {
        console.error(`[Cron] Error processing schedule ${schedule.id}:`, scheduleErr);
        executionResults.push({
          scheduleId: schedule.id,
          name: schedule.name,
          status: 'ERROR',
          error: scheduleErr.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      dueCount: schedulesToProcess.length,
      processed: executionResults,
    });
  } catch (error: any) {
    console.error('[GET /api/cron/ai-notifications] Error:', error);
    return NextResponse.json({ message: error?.message || 'Cron execution failed.' }, { status: 500 });
  }
}
