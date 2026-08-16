import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
const getUserId = (request: NextRequest) => request.headers.get('x-user-id') || request.headers.get('x-current-user-id');
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request); if (!userId) return NextResponse.json({ message: 'Community Locked' }, { status: 401 });
  const { id } = await params;
  const [user, tournament] = await Promise.all([prisma.user.findUnique({ where: { id: userId } }), getTournamentByIdFromDb(id)]);
  if (!user) return NextResponse.json({ message: 'Community Locked' }, { status: 401 });
  if (!tournament?.community?.enabled || tournament.community.isDisabled) return NextResponse.json({ message: 'Community access is disabled' }, { status: 403 });
  const [slot, approvedPayment] = await Promise.all([prisma.participant.findFirst({ where: { tournamentId: id, userId: user.id } }), prisma.payment.findFirst({ where: { tournamentId: id, userId: user.id, status: 'VERIFIED' } })]);
  if (!slot || !approvedPayment) return NextResponse.json({ message: 'Community Locked' }, { status: 403 });
  const inviteLink = tournament.community.inviteLink.trim(); if (!inviteLink) return NextResponse.json({ message: 'Community link is not available' }, { status: 404 });
  return NextResponse.json({ inviteLink, communityName: tournament.community.communityName, communityDescription: tournament.community.communityDescription, communityType: tournament.community.accessType });
}
export const POST = GET;
