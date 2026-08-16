import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listTournamentsFromDb } from '@/lib/tournament-store';

export async function GET() {
  try {
    const tournaments = await listTournamentsFromDb();
    return NextResponse.json({ tournaments });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Failed to load tournaments' }, { status: 500 });
  }
}
