import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AdminPermissionKey } from './types';

export type AdminRole = 'OWNER' | 'SUB_ADMIN' | 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';

export interface AdminSessionPayload {
  sub: string;
  email: string;
  username?: string;
  displayName?: string;
  role: AdminRole;
  permissions?: AdminPermissionKey[];
  iat: number;
  exp: number;
}

interface LoginAttemptRecord {
  count: number;
  firstAttempt: number;
}

const SESSION_TTL_MS = 10 * 60 * 1000; // Strictly 10 minutes session TTL
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'blackrock-esports-admin-secret-key-2026';

const loginAttempts = new Map<string, LoginAttemptRecord>();

export const ALL_PERMISSIONS: AdminPermissionKey[] = [
  'view_dashboard',
  'manage_tournaments',
  'enter_results',
  'manage_users',
  'manage_bans',
  'moderate_lfg',
  'manage_deposits',
  'manage_withdrawals',
  'adjust_wallets',
  'view_financial_reports',
  'manage_referrals',
  'manage_watch_earn',
  'manage_roles',
  'approve_deletes',
  'send_notifications',
  'manage_settings',
];

export const adminAuditLog: Array<{
  id: string;
  actor: string;
  action: string;
  details: string;
  targetType?: string;
  targetId?: string;
  createdAt: string;
}> = [];

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function signPayload(payload: AdminSessionPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET).update(encoded).digest('hex');
  return `${encoded}.${signature}`;
}

function verifySignature(token: string) {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const expected = createHmac('sha256', SESSION_SECRET).update(encoded).digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length) return null;
  try {
    const isValid = timingSafeEqual(expectedBuffer, actualBuffer);
    return isValid ? encoded : null;
  } catch {
    return null;
  }
}

function handleRateLimiting(ip: string) {
  const existing = loginAttempts.get(ip);
  const now = Date.now();
  if (!existing) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return false;
  }
  if (now - existing.firstAttempt > LOCKOUT_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return false;
  }
  const nextCount = existing.count + 1;
  loginAttempts.set(ip, { count: nextCount, firstAttempt: existing.firstAttempt });
  return nextCount >= MAX_LOGIN_ATTEMPTS;
}

function resetRateLimiting(ip: string) {
  loginAttempts.delete(ip);
}

export function logAdminAction(
  actor: string,
  action: string,
  details: string,
  targetType?: string,
  targetId?: string
) {
  const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  adminAuditLog.unshift({
    id: logId,
    actor,
    action,
    details,
    targetType,
    targetId,
    createdAt: now,
  });

  // Keep in-memory log bounded
  if (adminAuditLog.length > 500) {
    adminAuditLog.pop();
  }

  console.info(`[ADMIN-AUDIT] ${actor} :: ${action} :: ${details}`);

  // Asynchronously insert into Supabase AdminActivityLog table
  void (async () => {
    try {
      await supabaseAdmin.from('AdminActivityLog').insert([{
        id: logId,
        adminUsername: actor,
        action,
        targetType: targetType || null,
        targetId: targetId || null,
        details,
        createdAt: now,
      }]);
    } catch {
      // Ignore background log write failures
    }
  })();
}

export async function authenticateAdmin(identifier: string, password: string, request: NextRequest) {
  const ip = getClientIp(request);
  const locked = handleRateLimiting(ip);
  if (locked) {
    return { ok: false, status: 429, message: 'Too many failed login attempts. Please wait 15 minutes before trying again.' };
  }

  const cleanIdent = identifier.trim().toLowerCase();

  // 1. Query Supabase AdminAccount table directly by username or email
  try {
    const { data: adminAccount, error } = await supabaseAdmin
      .from('AdminAccount')
      .select('*')
      .or(`username.ilike.${cleanIdent},email.ilike.${cleanIdent}`)
      .maybeSingle();

    if (adminAccount && !error) {
      if (!adminAccount.isActive) {
        return { ok: false, status: 403, message: 'Your admin account has been deactivated.' };
      }

      const passwordMatches = await bcrypt.compare(password, adminAccount.passwordHash);
      if (passwordMatches) {
        resetRateLimiting(ip);
        const role = (adminAccount.role as AdminRole) || 'ADMIN';
        const isOwner = role === 'OWNER' || role === 'SUPER_ADMIN';

        const payload: AdminSessionPayload = {
          sub: adminAccount.id,
          email: adminAccount.email || adminAccount.username,
          username: adminAccount.username,
          displayName: adminAccount.displayName || adminAccount.username,
          role,
          permissions: isOwner ? ALL_PERMISSIONS : (adminAccount.permissions as AdminPermissionKey[]) || [],
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor((Date.now() + SESSION_TTL_MS) / 1000),
        };
        const token = signPayload(payload);
        const csrfToken = randomBytes(24).toString('hex');
        logAdminAction(adminAccount.username, 'LOGIN', `Admin '${adminAccount.username}' (${role}) signed in successfully`);
        return { ok: true, status: 200, user: { id: adminAccount.id, email: payload.email, username: payload.username, role: payload.role, displayName: payload.displayName, permissions: payload.permissions }, token, csrfToken };
      }
    }
  } catch (err) {
    console.warn('[authenticateAdmin] Supabase AdminAccount check warning:', err);
  }

  // 2. Fallback Bcrypt Verification (Zero plain-text passwords in code)
  const masterHashes: Record<string, { role: AdminRole, hashes: string[], name: string }> = {
    ashik: { role: 'OWNER', hashes: ['$2b$10$6V1KaVlRW.5plwERNT/QFOvzlja44Pi50c/Hwtn01qxo06.6oQmD.'], name: 'Platform Owner (Ashik)' },
    turjo: { role: 'OWNER', hashes: ['$2b$10$eMSobXh/GxIwGUSeLA8tuult3o4rcOeY1lnQh8GCtndUpTgexrJ0G', '$2b$10$w9S62a33tXC.TrSmQmV9m.A7pcbkw7WQ4xEgy6XlkUkt096LmLdAu'], name: 'Turjo (Owner)' },
    ayan: { role: 'OWNER', hashes: ['$2b$10$e2C6XdBNHzp89rtV1snA8u25d7eBHDyM7a5INEFULq6ierbDLdp6.'], name: 'Ayan (Owner)' },
    admin: { role: 'OWNER', hashes: ['$2b$10$6V1KaVlRW.5plwERNT/QFOvzlja44Pi50c/Hwtn01qxo06.6oQmD.'], name: 'Platform Owner' },
  };

  const masterConfig = masterHashes[cleanIdent];
  if (masterConfig) {
    let isMasterMatch = false;
    for (const h of masterConfig.hashes) {
      if (await bcrypt.compare(password, h)) {
        isMasterMatch = true;
        break;
      }
    }
    if (!isMasterMatch && process.env.ADMIN_PASSWORD_HASH) {
      isMasterMatch = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    }

    if (isMasterMatch) {
      resetRateLimiting(ip);
      const payload: AdminSessionPayload = {
        sub: `admin-owner-${cleanIdent}`,
        email: `${cleanIdent}@blackrock.gg`,
        username: cleanIdent,
        displayName: masterConfig.name,
        role: masterConfig.role,
        permissions: ALL_PERMISSIONS,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + SESSION_TTL_MS) / 1000),
      };
      const token = signPayload(payload);
      const csrfToken = randomBytes(24).toString('hex');
      logAdminAction(cleanIdent, 'LOGIN', `Master Admin '${cleanIdent}' signed in`);
      return { ok: true, status: 200, user: { id: payload.sub, email: payload.email, username: payload.username, role: payload.role, displayName: payload.displayName, permissions: payload.permissions }, token, csrfToken };
    }
  }

  return { ok: false, status: 401, message: 'Invalid admin credentials.' };
}

export function verifyAdminSession(token: string | undefined): AdminSessionPayload | null {
  if (!token) return null;
  const raw = verifySignature(token);
  if (!raw) return null;
  try {
    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8')) as AdminSessionPayload;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hasPermission(session: AdminSessionPayload | null, permission: AdminPermissionKey): boolean {
  if (!session) return false;
  // Owner and Super Admin have unrestricted master bypass
  if (session.role === 'OWNER' || session.role === 'SUPER_ADMIN') return true;
  return session.permissions?.includes(permission) ?? false;
}

export function isOwner(session: AdminSessionPayload | null): boolean {
  if (!session) return false;
  return session.role === 'OWNER' || session.role === 'SUPER_ADMIN';
}

export function requireAdminRole(session: AdminSessionPayload | null, allowedRoles: AdminRole[]): boolean {
  if (!session) return false;
  if (session.role === 'OWNER' || session.role === 'SUPER_ADMIN') return true;
  return allowedRoles.includes(session.role);
}

export function createAdminSessionCookie(token: string) {
  return {
    name: 'admin_session',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export function createCsrfCookie(token: string) {
  return {
    name: 'admin_csrf',
    value: token,
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export function clearAdminCookies() {
  return [
    {
      name: 'admin_session',
      value: '',
      path: '/',
      expires: new Date(0),
    },
    {
      name: 'admin_csrf',
      value: '',
      path: '/',
      expires: new Date(0),
    },
  ];
}

export function validateAdminInput(value: unknown, minLength = 1, maxLength = 255, fieldName = 'Field'): string {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed;
}

export function validateNumberInput(value: unknown, min = 0, max = 100000000): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (isNaN(num)) return undefined;
  return Math.min(max, Math.max(min, num));
}
