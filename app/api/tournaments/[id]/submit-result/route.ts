import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseScoreboardWithAI } from '@/lib/ai-scoreboard-ocr';
import { saveBase64Image } from '@/lib/upload';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const body = await request.json();
    const { userId, squadName, screenshot } = body;

    if (!tournamentId || !userId || !screenshot) {
      return NextResponse.json({ message: 'Tournament ID, User ID, and Screenshot are required.' }, { status: 400 });
    }

    // 1. Fetch Tournament Context
    const { data: tour, error: tourErr } = await supabaseAdmin
      .from('Tournament')
      .select('id, title, prizePool, status')
      .eq('id', tournamentId)
      .single();

    if (tourErr || !tour) {
      return NextResponse.json({ message: 'Tournament not found.' }, { status: 404 });
    }

    // 2. Upload Screenshot
    let screenshotUrl = screenshot;
    if (screenshot.startsWith('data:image')) {
      try {
        screenshotUrl = await saveBase64Image(screenshot, 'match_scoreboard');
      } catch {}
    }

    // 3. Run Gemini Vision AI OCR
    const ocrResult = await parseScoreboardWithAI(screenshot, {
      title: tour.title,
      prizePool: tour.prizePool || 0,
    });

    // 4. Save Submission Record in SiteSetting / Table
    const submissionId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const submissionData = {
      id: submissionId,
      tournamentId,
      tournamentTitle: tour.title,
      submittedByUserId: userId,
      squadName: squadName || 'Player Squad',
      screenshotUrl,
      ocrResult,
      status: 'PENDING_APPROVAL',
      submittedAt: new Date().toISOString(),
    };

    // Store in SiteSetting key: `MATCH_RESULT_${tournamentId}`
    try {
      const { data: existing } = await supabaseAdmin
        .from('SiteSetting')
        .select('value')
        .eq('key', `MATCH_SUBMISSIONS_${tournamentId}`)
        .maybeSingle();

      let currentSubmissions: any[] = [];
      if (existing?.value) {
        try {
          currentSubmissions = JSON.parse(existing.value);
        } catch {}
      }

      await supabaseAdmin
        .from('SiteSetting')
        .upsert({
          id: `setting_match_sub_${tournamentId}`,
          key: `MATCH_SUBMISSIONS_${tournamentId}`,
          value: JSON.stringify([submissionData, ...currentSubmissions]),
          updatedAt: new Date().toISOString(),
        }, { onConflict: 'key' });
    } catch (saveErr) {
      console.warn('[submit-result] Save notice:', saveErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Match scoreboard submitted! AI is analyzing your results for verification.',
      submissionId,
      ocrResult,
    });
  } catch (error: any) {
    console.error('[POST /api/tournaments/[id]/submit-result]', error);
    return NextResponse.json({ message: error?.message || 'Failed to submit match result.' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', `MATCH_SUBMISSIONS_${tournamentId}`)
      .maybeSingle();

    let submissions: any[] = [];
    if (setting?.value) {
      try {
        submissions = JSON.parse(setting.value);
      } catch {}
    }

    return NextResponse.json({ success: true, submissions });
  } catch (error: any) {
    console.error('[GET /api/tournaments/[id]/submit-result]', error);
    return NextResponse.json({ submissions: [] });
  }
}
