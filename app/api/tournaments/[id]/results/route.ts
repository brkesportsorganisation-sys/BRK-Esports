import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
import { getTournamentRooms, getTournamentPointsTables, saveTournamentPointsTables } from '@/lib/tournament-rooms';
import { parseScoreboardWithAI } from '@/lib/ai-scoreboard-ocr';
import { saveBase64Image } from '@/lib/upload';
import { TournamentPointsTable } from '@/lib/types';
import { supabaseAdmin } from '@/lib/supabase';
import { sendDirectWhatsappMessage, normalizePhoneNumber } from '@/lib/whatsapp';

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

/**
 * GET /api/tournaments/[id]/results
 * Public endpoint to get published points tables and match standings.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    if (!tournamentId) {
      return NextResponse.json({ message: 'Tournament ID is required.' }, { status: 400 });
    }

    const pointsTables = await getTournamentPointsTables(tournamentId);

    return NextResponse.json(
      {
        success: true,
        pointsTables: pointsTables || [],
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
        },
      }
    );
  } catch (err: any) {
    console.error('[GET /api/tournaments/[id]/results] Error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch points tables.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tournaments/[id]/results
 * Admin-only endpoint to scan scoreboards with AI, publish points tables, and manage results.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
      return NextResponse.json({ message: 'Unauthorized. Admin session required.' }, { status: 403 });
    }

    const { id: tournamentId } = await params;
    const body = await request.json();
    const { action } = body;

    const tournament = await getTournamentByIdFromDb(tournamentId);
    if (!tournament) {
      return NextResponse.json({ message: 'Tournament not found.' }, { status: 404 });
    }

    // ─── ACTION 1: SCAN SCOREBOARD WITH GEMINI VISION AI ─────────────────────
    if (action === 'SCAN_SCOREBOARD') {
      const { screenshot, roomId, roomLabel } = body;
      if (!screenshot) {
        return NextResponse.json({ message: 'Scoreboard screenshot image is required.' }, { status: 400 });
      }

      // 1. Upload screenshot if base64
      let screenshotUrl = screenshot;
      if (screenshot.startsWith('data:image')) {
        try {
          screenshotUrl = await saveBase64Image(screenshot, 'scoreboard');
        } catch {}
      }

      // 2. Fetch registered participants for this room to fuzzy-match team names
      const rooms = await getTournamentRooms(tournamentId, tournament);
      const targetRoom = rooms.find(r => r.id === roomId || r.roomLabel === roomLabel) || rooms[0];
      const registeredTeams = ((targetRoom as any)?.participants || []).map((p: any) => ({
        id: p.id,
        name: p.squadName,
      }));

      // 3. Run Gemini Vision OCR
      const ocrResult = await parseScoreboardWithAI(screenshot, {
        title: tournament.title,
        prizePool: tournament.prizePool,
        killBounty: tournament.perKillPrize || 1,
        roomLabel: targetRoom?.roomLabel || roomLabel,
        registeredTeams,
      });

      return NextResponse.json({
        success: true,
        screenshotUrl,
        roomId: targetRoom?.id,
        roomLabel: targetRoom?.roomLabel,
        ocrResult,
      });
    }

    // ─── ACTION 2: PUBLISH / SAVE POINTS TABLE ────────────────────────────────
    if (action === 'PUBLISH_POINTS_TABLE') {
      const { tableData } = body;
      if (!tableData || !Array.isArray(tableData.scores)) {
        return NextResponse.json({ message: 'Valid points table scores data is required.' }, { status: 400 });
      }

      const pointsTables = await getTournamentPointsTables(tournamentId);
      const newTable: TournamentPointsTable = {
        id: tableData.id || `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tournamentId,
        roomId: tableData.roomId,
        roomLabel: tableData.roomLabel || 'A',
        stage: tableData.stage || 'Qualifier',
        matchNumber: Number(tableData.matchNumber) || 1,
        screenshotUrl: tableData.screenshotUrl,
        publishedAt: new Date().toISOString(),
        publishedBy: session?.displayName || session?.username || session?.email || 'Admin',
        scores: tableData.scores,
      };

      // Replace if table for same room and matchNumber exists, otherwise append
      const existingIdx = pointsTables.findIndex(
        t => t.roomId === newTable.roomId && t.matchNumber === newTable.matchNumber
      );

      if (existingIdx >= 0) {
        pointsTables[existingIdx] = newTable;
      } else {
        pointsTables.push(newTable);
      }

      await saveTournamentPointsTables(tournamentId, pointsTables);

      return NextResponse.json({
        success: true,
        message: `Points Table for Room ${newTable.roomLabel} published successfully!`,
        pointsTable: newTable,
        pointsTables,
      });
    }

    // ─── ACTION 3: DELETE POINTS TABLE ────────────────────────────────────────
    if (action === 'DELETE_POINTS_TABLE') {
      const { tableId } = body;
      const pointsTables = await getTournamentPointsTables(tournamentId);
      const filtered = pointsTables.filter(t => t.id !== tableId);
      await saveTournamentPointsTables(tournamentId, filtered);

      return NextResponse.json({
        success: true,
        message: 'Points Table deleted successfully.',
        pointsTables: filtered,
      });
    }

    // ─── ACTION 4: TARGETED BROADCAST TO GROUP SQUADS ONLY ───────────────────
    if (action === 'BROADCAST_GROUP_POINTS') {
      const { tableId, roomId, roomLabel, customNote } = body;
      const pointsTables = await getTournamentPointsTables(tournamentId);
      const targetTable = tableId
        ? pointsTables.find(t => t.id === tableId)
        : pointsTables.find(t => t.roomId === roomId || t.roomLabel === roomLabel);

      if (!targetTable || !Array.isArray(targetTable.scores) || targetTable.scores.length === 0) {
        return NextResponse.json({ message: 'Points table not found or has no scores to broadcast.' }, { status: 400 });
      }

      // Fetch participants for this tournament
      const { data: participants } = await supabaseAdmin
        .from('Participant')
        .select('*')
        .eq('tournamentId', tournamentId);

      const allParticipants = Array.isArray(participants) ? participants : [];

      // Filter STRICTLY to participants of THIS room / group only!
      const targetParticipants = allParticipants.filter((p) => {
        if (targetTable.roomId && p.roomId) {
          return p.roomId === targetTable.roomId;
        }
        if (targetTable.roomLabel && p.roomLabel) {
          return p.roomLabel.toLowerCase() === targetTable.roomLabel.toLowerCase();
        }
        return false;
      });

      if (targetParticipants.length === 0) {
        return NextResponse.json({
          message: `No squad participants found assigned to Group ${targetTable.roomLabel || 'A'}. Please ensure squads are assigned to this room before broadcasting.`,
        }, { status: 400 });
      }

      // Format top scores summary
      const sortedScores = [...targetTable.scores].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
      const standingsSummary = sortedScores.slice(0, 10).map((s, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        return `${medal} *${s.teamName}* — ${s.totalPoints} pts (${s.kills} kills)`;
      }).join('\n');

      const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://esportszonebd.online';
      const stageName = targetTable.stage || 'Official Match';
      const matchNum = targetTable.matchNumber || 1;
      const groupName = targetTable.roomLabel || 'A';

      let totalSent = 0;
      let totalFailed = 0;

      for (const p of targetParticipants) {
        const phone = p.captainWhatsApp || p.phone;
        if (!phone) {
          totalFailed++;
          continue;
        }

        const msg = `📢 *[ESPORTS ZONE BD — MATCH STANDINGS]*

Hello Captain *${p.iglName || p.squadName}*!
Match results for your group have been published!

🏆 *Tournament:* ${tournament.title}
⚔️ *Stage / Round:* ${stageName}
🎯 *Group:* Group ${groupName} (Match #${matchNum})

📊 *TOP STANDINGS:*
${standingsSummary}

${customNote ? `\n📌 *Admin Note:* ${customNote}` : ''}

👉 *View Complete Interactive Points Table & Roadmap:*
${siteUrl}/tournaments/${tournament.id}

_Stay tuned for upcoming round schedules! 🔥_`;

        try {
          const res = await sendDirectWhatsappMessage({
            to: normalizePhoneNumber(phone),
            text: msg,
            targetName: p.squadName,
            triggerType: 'ROOM_ALERT',
          });
          if (res?.success) totalSent++;
          else totalFailed++;
        } catch {
          totalFailed++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Points table broadcast sent to ${totalSent} squads of Group ${groupName} (${totalFailed} failed/unreachable).`,
        totalSent,
        totalFailed,
        targetSquadsCount: targetParticipants.length,
      });
    }

    return NextResponse.json({ message: 'Unknown action specified.' }, { status: 400 });
  } catch (err: any) {
    console.error('[POST /api/tournaments/[id]/results] Error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Internal server error processing match result.' },
      { status: 500 }
    );
  }
}
