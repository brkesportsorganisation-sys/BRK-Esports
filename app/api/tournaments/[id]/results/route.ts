import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
import { getTournamentRooms, getTournamentPointsTables, saveTournamentPointsTables } from '@/lib/tournament-rooms';
import { parseScoreboardWithAI } from '@/lib/ai-scoreboard-ocr';
import { saveBase64Image } from '@/lib/upload';
import { TournamentPointsTable } from '@/lib/types';

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

    return NextResponse.json({ message: 'Unknown action specified.' }, { status: 400 });
  } catch (err: any) {
    console.error('[POST /api/tournaments/[id]/results] Error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Internal server error processing match result.' },
      { status: 500 }
    );
  }
}
