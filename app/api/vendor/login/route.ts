import { NextRequest, NextResponse } from 'next/server';
import { authenticateVendor, createVendorSessionCookie } from '@/lib/vendor-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, email, password } = body;

    const loginId = identifier || email;
    if (!loginId || !password) {
      return NextResponse.json(
        { message: 'Vendor ID or Email and password are required.' },
        { status: 400 }
      );
    }

    const authResult = await authenticateVendor(loginId, password);
    if (!authResult.ok || !authResult.token) {
      return NextResponse.json(
        { message: authResult.message || 'Invalid Vendor ID or password.' },
        { status: authResult.status || 401 }
      );
    }

    const cookieOptions = createVendorSessionCookie(authResult.token);
    const response = NextResponse.json({
      vendor: authResult.vendor,
      message: 'Vendor signed in successfully!',
    });

    response.cookies.set(cookieOptions);

    return response;
  } catch (error: any) {
    console.error('[POST /api/vendor/login]', error);
    return NextResponse.json(
      { message: error?.message || 'Vendor authentication failed.' },
      { status: 500 }
    );
  }
}
