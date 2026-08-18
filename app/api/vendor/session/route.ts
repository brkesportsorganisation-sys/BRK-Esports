import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyVendorSession } from '@/lib/vendor-auth';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('vendor_session')?.value;
  const session = verifyVendorSession(token);

  if (!session) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  return NextResponse.json({
    vendor: {
      id: session.sub,
      vendorId: session.vendorId,
      name: session.name,
      email: session.email,
      accessLevel: session.accessLevel,
      permissions: session.permissions,
      assignedTournaments: session.assignedTournaments,
    },
    exp: session.exp,
  });
}
