import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { inspectRequestSecurity, checkRateLimit, applySecurityHeaders } from '@/lib/security-firewall';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Extract client IP safely
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   request.headers.get('x-real-ip') || 
                   '127.0.0.1';

  // 1. WAF Deep Inspection (Block SQLi, XSS, Path Traversal, Malicious Bots)
  const inspection = inspectRequestSecurity(request);
  if (inspection.blocked) {
    console.warn(`[WAF Blocked] IP: ${clientIp} Path: ${pathname} Reason: ${inspection.reason}`);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Forbidden', 
        message: 'Request blocked by ESPORTS ZONE BD Web Application Firewall (WAF).',
        code: 'WAF_ATTACK_DETECTED'
      }),
      { 
        status: 403, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  // 2. IP Rate Limiting (DDoS & Brute Force Protection)

  let routeType: 'AUTH' | 'WALLET' | 'OTP' | 'GENERAL' = 'GENERAL';
  if (pathname.startsWith('/api/auth/forgot-password') || pathname.startsWith('/api/auth/reset-password')) {
    routeType = 'OTP';
  } else if (pathname.startsWith('/api/auth')) {
    routeType = 'AUTH';
  } else if (pathname.startsWith('/api/wallet')) {
    routeType = 'WALLET';
  }

  if (pathname.startsWith('/api/')) {
    const rateLimit = checkRateLimit(clientIp, routeType);
    if (!rateLimit.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please wait before making further requests.',
          retryAfterSec: rateLimit.retryAfterSec,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfterSec || 60),
          },
        }
      );
    }
  }

  // 3. Admin Route Authentication Enforcement (10-Minute TTL & Session Protection)
  const adminSession = request.cookies.get('admin_session')?.value;
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!adminSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    try {
      const [encoded] = adminSession.split('.');
      if (encoded) {
        const jsonStr = Buffer.from(encoded, 'base64url').toString('utf-8');
        const payload = JSON.parse(jsonStr);
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          const response = NextResponse.redirect(new URL('/admin/login?reason=expired', request.url));
          response.cookies.set('admin_session', '', { maxAge: 0, path: '/' });
          return response;
        }
      }
    } catch {
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.set('admin_session', '', { maxAge: 0, path: '/' });
      return response;
    }
  }

  // 4. Vendor Route Authentication Enforcement
  const vendorSession = request.cookies.get('vendor_session')?.value;
  if (
    (pathname.startsWith('/vendor') || pathname.startsWith('/vandor')) &&
    !pathname.startsWith('/vendor/login') &&
    !pathname.startsWith('/vandor/login')
  ) {
    if (!vendorSession) {
      return NextResponse.redirect(new URL('/vendor/login', request.url));
    }
  }

  // 5. Attach Enterprise Security Headers
  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, logo.png, manifest.json, sw.js, and static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|json|js|css|woff2?)).*)',
  ],
};


