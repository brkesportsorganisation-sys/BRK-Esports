import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AdminSessionPayload {
  sub: string;
  email: string;
  role: AdminRole;
  iat: number;
  exp: number;
}

interface LoginAttemptRecord {
  count: number;
  firstAttempt: number;
}

const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'change-me-in-production';

const loginAttempts = new Map<string, LoginAttemptRecord>();

export const adminAuditLog: Array<{ id: string; actor: string; action: string; details: string; createdAt: string }> = [];

const initialAdmin = {
  id: 'admin-super-001',
  name: 'Super Admin',
  email: process.env.ADMIN_EMAIL || 'ashik',
  role: 'SUPER_ADMIN' as AdminRole,
  passwordHash: process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'ashik@2008', 12),
  createdAt: new Date().toISOString(),
};

const adminUsers: AdminUser[] = [initialAdmin];

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function hashPassword(password: string) {
  return bcrypt.hashSync(password, 12);
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
    // FIX: Must check the boolean return value of timingSafeEqual
    const isValid = timingSafeEqual(expectedBuffer, actualBuffer);
    return isValid ? encoded : null;
  } catch {
    return null;
  }
}

function getCurrentTimestamp() {
  return Date.now();
}

function sanitizeUser(user: AdminUser) {
  const { passwordHash, ...rest } = user;
  return rest;
}

function handleRateLimiting(ip: string) {
  const existing = loginAttempts.get(ip);
  const now = getCurrentTimestamp();
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

export function createAdminAuditEntry(actor: string, action: string, details: string) {
  adminAuditLog.unshift({
    id: `audit_${Date.now()}`,
    actor,
    action,
    details,
    createdAt: new Date().toISOString(),
  });
}

export function logAdminAction(actor: string, action: string, details: string) {
  createAdminAuditEntry(actor, action, details);
  console.info(`[ADMIN-AUDIT] ${actor} :: ${action} :: ${details}`);
}

export function getAdminUsers() {
  return adminUsers.map(sanitizeUser);
}

export function getAdminUserByEmail(email: string) {
  return adminUsers.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export async function authenticateAdmin(email: string, password: string, request: NextRequest) {
  const ip = getClientIp(request);
  const locked = handleRateLimiting(ip);
  if (locked) {
    return { ok: false, status: 429, message: 'Too many failed login attempts. Please wait 15 minutes before trying again.' };
  }

  const user = getAdminUserByEmail(email);
  if (!user) {
    return { ok: false, status: 401, message: 'Invalid admin credentials.' };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return { ok: false, status: 401, message: 'Invalid admin credentials.' };
  }

  resetRateLimiting(ip);
  user.lastLoginAt = new Date().toISOString();
  const payload: AdminSessionPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(getCurrentTimestamp() / 1000),
    exp: Math.floor((getCurrentTimestamp() + SESSION_TTL_MS) / 1000),
  };
  const token = signPayload(payload);
  const csrfToken = randomBytes(24).toString('hex');
  logAdminAction(user.email, 'AUTH_LOGIN', 'Successful admin login');
  return { ok: true, user: sanitizeUser(user), token, csrfToken };
}

export function verifyAdminSession(token: string | undefined) {
  if (!token) return null;
  const encoded = verifySignature(token);
  if (!encoded) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AdminSessionPayload;
    if (payload.exp * 1000 < getCurrentTimestamp()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(payload: AdminSessionPayload) {
  return signPayload(payload);
}

export function createAdminSessionCookie(token: string) {
  return {
    name: 'admin_session',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 4, // 4 hours
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
    maxAge: 60 * 60 * 4, // 4 hours
  };
}

export function clearAdminCookies() {
  return [
    { name: 'admin_session', value: '', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 0 },
    { name: 'admin_csrf', value: '', httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 0 },
  ];
}

export function requireAdminRole(session: AdminSessionPayload | null, allowedRoles: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR']) {
  if (!session) return false;
  return allowedRoles.includes(session.role);
}

export function getAdminUserBySession(session: AdminSessionPayload | null) {
  if (!session) return null;
  return getAdminUserByEmail(session.email);
}

export function normalizeAdminRole(role: string): AdminRole {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MODERATOR') return role;
  return 'USER';
}

export function validateAdminInput(value: unknown, min = 1, max = 200) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) return null;
  return trimmed;
}

export function validateNumberInput(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
