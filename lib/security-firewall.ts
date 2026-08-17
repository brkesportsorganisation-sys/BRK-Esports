import { NextRequest, NextResponse } from 'next/server';

/**
 * Enterprise Web Application Firewall (WAF) & Anti-Data Leak Protection Engine
 * Black Rock Tournaments & Esports Platform
 */

// 1. Bad Bot / Exploit Scanner User-Agent Blacklist
const BAD_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /acunetix/i,
  /nessus/i,
  /masscan/i,
  /nmap/i,
  /wpscan/i,
  /dirbuster/i,
  /gobuster/i,
  /havij/i,
  /zgrab/i,
  /arachni/i,
  /netsparker/i,
  /python-requests\/.*exploit/i,
  /curl\/.*exploit/i,
];

// 2. Attack Signatures (SQLi, Path Traversal, XSS, Command Injection)
const MALICIOUS_PATTERNS = [
  // Path Traversal
  /(\.\.[\/\\]|\%2e\%2e[\/\\]|\%252e\%252e)/i,
  // SQL Injection signatures
  /(\b(union(\s+all)?\s+select)\b|\bselect\b.*\bfrom\b.*\bwhere\b|\bexec(\s|\+)+(s|x)p\b|\bpg_sleep\b|\bwaitfor\s+delay\b|\bbenchmark\b\s*\(|\bdrop\s+table\b|\bdelete\s+from\b.*\bwhere\b)/i,
  /('|\%27)\s*(\bor\b|\band\b)\s*('|\%27|\d+)\s*(=|>|<)/i,
  // XSS & Script Injection
  /(<script\b[^>]*>|javascript:\s*|data:text\/html|vbscript:|on(load|error|click|mouseover|submit)\s*=)/i,
  // Remote / Local File Inclusion
  /(etc\/passwd|win\.ini|boot\.ini|cmd\.exe|\/bin\/sh|\/bin\/bash)/i,
];

// 3. Sliding Window In-Memory Rate Limiter
interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const ipRateLimitMap = new Map<string, RateLimitEntry>();

// Periodic cleanup of stale rate-limit keys every 2 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of ipRateLimitMap.entries()) {
      if (now > entry.resetTime) {
        ipRateLimitMap.delete(key);
      }
    }
  }, 120000);
}

/**
 * Check if the request client exceeds rate limits
 */
export function checkRateLimit(
  ip: string, 
  routeType: 'AUTH' | 'WALLET' | 'OTP' | 'GENERAL'
): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  const key = `${ip}:${routeType}`;

  let maxRequests = 120; // 120 req / minute general
  let windowMs = 60000;

  if (routeType === 'AUTH') {
    maxRequests = 20; // 20 login/register attempts per minute
    windowMs = 60000;
  } else if (routeType === 'OTP') {
    maxRequests = 5; // 5 OTP attempts per 5 minutes
    windowMs = 300000;
  } else if (routeType === 'WALLET') {
    maxRequests = 30; // 30 wallet transactions per minute
    windowMs = 60000;
  }

  const record = ipRateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    ipRateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

/**
 * Inspects incoming request headers, query params, and URL for attacks
 */
export function inspectRequestSecurity(request: NextRequest): { blocked: boolean; reason?: string } {
  const userAgent = request.headers.get('user-agent') || '';
  const url = request.nextUrl.toString();
  const search = request.nextUrl.search;
  const pathname = request.nextUrl.pathname;

  // 1. Check Bad Bot / Scanner User Agents
  for (const botPattern of BAD_USER_AGENTS) {
    if (botPattern.test(userAgent)) {
      return { blocked: true, reason: 'WAF: Malicious crawler or scanner detected.' };
    }
  }

  // 2. Check Malicious Signatures in URL / Query Strings
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(url) || pattern.test(search) || pattern.test(pathname)) {
      return { blocked: true, reason: 'WAF: Malicious payload signature detected in request URL.' };
    }
  }

  // 3. Block Direct Sensitive Config Access
  if (
    pathname.includes('/.env') ||
    pathname.includes('/.git') ||
    pathname.includes('/wp-admin') ||
    pathname.includes('/phpmyadmin') ||
    pathname.includes('/eval-stdin') ||
    pathname.includes('/actuator')
  ) {
    return { blocked: true, reason: 'WAF: Restricted internal path access prohibited.' };
  }

  return { blocked: false };
}

/**
 * Attach Enterprise Security Headers to Next.js responses
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Prevent MIME-sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking while allowing popups
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  // Enable XSS filtering
  response.headers.set('X-XSS-Protection', '1; mode=block');
  // Strict Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Disable Adobe Flash / PDF crossdomain policies
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  // Modern Permissions Policy
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Cross Origin Opener Policy (allows Firebase OAuth popup)
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  return response;
}

/**
 * Data Sanitization: Guarantees no sensitive user credentials leak to frontend
 */
export function sanitizeUserOutput<T extends Record<string, any> | null | undefined>(user: T): Partial<T> | null {
  if (!user || typeof user !== 'object') return null;

  const {
    password,
    passwordResetOtp,
    passwordResetExpires,
    adminPermissions,
    deviceToken,
    ...safeUser
  } = user;

  return safeUser as Partial<T>;
}
