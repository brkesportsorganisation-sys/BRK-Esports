import { NextRequest, NextResponse } from 'next/server';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
import { getTournamentRooms, getTournamentRoadmap, saveTournamentRoadmap, saveTournamentRooms } from '@/lib/tournament-rooms';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { cookies } from 'next/headers';
import { TournamentRoadmapConfig, TournamentRoom } from '@/lib/types';

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

/**
 * GET /api/tournaments/[id]/roadmap
 * Returns roadmap configuration, stages, rooms, and progression rules.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;
  if (!tournamentId) {
    return NextResponse.json({ message: 'Tournament ID is required' }, { status: 400 });
  }

  try {
    const tournament = await getTournamentByIdFromDb(tournamentId);
    if (!tournament) {
      return NextResponse.json({ message: 'Tournament not found' }, { status: 404 });
    }

    const rooms = await getTournamentRooms(tournamentId, tournament);
    const roadmap = await getTournamentRoadmap(tournamentId, tournament, rooms);

    return NextResponse.json({
      success: true,
      tournamentId,
      tournamentTitle: tournament.title,
      tournamentFormat: tournament.tournamentBatchFormat || 'SINGLE_ROOM',
      roadmap,
      rooms,
    });
  } catch (error: any) {
    console.error('[GET /api/tournaments/[id]/roadmap] Error:', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch roadmap' }, { status: 500 });
  }
}

/**
 * POST /api/tournaments/[id]/roadmap
 * Save / update tournament stages, schedules, map rotations, and roadmap rules (Admin only).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;
  const session = await getAdminSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { roadmapConfig, roomsList } = body;

    const tournament = await getTournamentByIdFromDb(tournamentId);
    if (!tournament) {
      return NextResponse.json({ message: 'Tournament not found' }, { status: 404 });
    }

    if (!roadmapConfig || typeof roadmapConfig !== 'object') {
      return NextResponse.json({ message: 'Invalid roadmapConfig payload' }, { status: 400 });
    }

    // Save roadmap configuration
    await saveTournamentRoadmap(tournamentId, roadmapConfig as TournamentRoadmapConfig);

    // If rooms with updated stages/maps/matchTime were also supplied, save them too
    if (Array.isArray(roomsList) && roomsList.length > 0) {
      await saveTournamentRooms(tournamentId, roomsList as TournamentRoom[]);
    }

    await logAdminAction(
      session?.sub || session?.email || 'admin',
      'UPDATE_TOURNAMENT_ROADMAP',
      `Updated roadmap & schedule stages for "${tournament.title}"`
    );

    return NextResponse.json({
      success: true,
      message: 'Tournament roadmap & schedule updated successfully!',
      roadmap: roadmapConfig,
    });
  } catch (error: any) {
    console.error('[POST /api/tournaments/[id]/roadmap] Error:', error);
    return NextResponse.json({ message: error?.message || 'Failed to update roadmap' }, { status: 500 });
  }
}
