import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { generateAINotification } from '@/lib/ai-notification';
import { supabaseAdmin } from '@/lib/supabase';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { prompt, category = 'GENERAL', tournamentId, urgency = 'MEDIUM' } = body;

    let tournamentContext: any = {};
    if (tournamentId) {
      const { data: tour } = await supabaseAdmin
        .from('Tournament')
        .select('title, prizePool, entryFee, maxTeams, registeredCount')
        .eq('id', tournamentId)
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

    const aiResult = await generateAINotification({
      prompt: prompt || 'Announce exciting esports tournament matches and rewards.',
      category,
      urgency,
      ...tournamentContext,
    });

    return NextResponse.json({ success: true, data: aiResult });
  } catch (error: any) {
    console.error('[POST /api/admin/notifications/ai-generate] Error:', error);
    return NextResponse.json({ message: error?.message || 'Failed to generate AI notification.' }, { status: 500 });
  }
}
