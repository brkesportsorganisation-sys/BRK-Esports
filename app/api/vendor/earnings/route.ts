import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyVendorSession, hasVendorPermission } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';
import { listTournamentsFromDb } from '@/lib/tournament-store';

async function getVendorSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('vendor_session')?.value;
  return verifyVendorSession(token);
}

export async function GET() {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  if (!hasVendorPermission(session, 'view_own_earnings')) {
    return NextResponse.json(
      { message: 'You do not have permission to view earnings.' },
      { status: 403 }
    );
  }

  try {
    let tournaments = await listTournamentsFromDb();
    if (!tournaments || tournaments.length === 0) {
      tournaments = db.getTournaments();
    }

    const isFull = session.accessLevel === 'FULL_ACCESS';
    const vendorTournaments = isFull || session.assignedTournaments.includes('ALL')
      ? tournaments
      : tournaments.filter((t) => session.assignedTournaments.includes(t.id));

    const commissionRate = session.commissionRate ?? 80;

    let totalGrossRevenue = 0;
    let escrowEarnings = 0;
    let availableEarnings = 0;

    const breakdown = vendorTournaments.map((t) => {
      const gross = (t.registeredCount || 0) * (t.entryFee || 0);
      const vendorShare = Math.round((gross * commissionRate) / 100);
      const platformShare = gross - vendorShare;

      totalGrossRevenue += gross;

      if (t.status === 'FINISHED') {
        availableEarnings += vendorShare;
      } else {
        escrowEarnings += vendorShare;
      }

      return {
        id: t.id,
        title: t.title,
        status: t.status,
        entryFee: t.entryFee,
        registeredCount: t.registeredCount,
        grossRevenue: gross,
        vendorEarnings: vendorShare,
        platformFee: platformShare,
      };
    });

    return NextResponse.json({
      commissionRate,
      totalGrossRevenue,
      escrowEarnings, // In escrow until match is completed
      availableEarnings, // Available for withdrawal
      totalEarnings: escrowEarnings + availableEarnings,
      breakdown,
    });
  } catch (error: any) {
    console.error('[GET /api/vendor/earnings]', error);
    return NextResponse.json({
      commissionRate: 80,
      totalGrossRevenue: 0,
      escrowEarnings: 0,
      availableEarnings: 0,
      totalEarnings: 0,
      breakdown: [],
    });
  }
}
