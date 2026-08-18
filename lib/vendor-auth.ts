import { createHmac, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { VendorAccessLevel, VendorPermissionKey, VendorAccount } from './types';
import { db } from './db';

export interface VendorSessionPayload {
  sub: string; // Account ID
  vendorId: string; // e.g. VND-8492
  name: string;
  orgName?: string;
  email: string;
  accessLevel: VendorAccessLevel;
  permissions: VendorPermissionKey[];
  assignedTournaments: string[];
  commissionRate?: number;
  iat: number;
  exp: number;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'blackrock-esports-admin-secret-key-2026';

function signPayload(payload: VendorSessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET).update(encoded).digest('hex');
  return `${encoded}.${signature}`;
}

function verifySignature(token: string): string | null {
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

export function createVendorToken(vendor: VendorAccount): string {
  const payload: VendorSessionPayload = {
    sub: vendor.id,
    vendorId: vendor.vendorId,
    name: vendor.name,
    orgName: vendor.orgName || vendor.name,
    email: vendor.email,
    accessLevel: vendor.accessLevel,
    permissions: vendor.permissions || [],
    assignedTournaments: vendor.assignedTournaments || [],
    commissionRate: vendor.commissionRate ?? 80,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + SESSION_TTL_MS) / 1000),
  };
  return signPayload(payload);
}

export function verifyVendorSession(token: string | undefined): VendorSessionPayload | null {
  if (!token) return null;
  const raw = verifySignature(token);
  if (!raw) return null;
  try {
    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8')) as VendorSessionPayload;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hasVendorPermission(
  session: VendorSessionPayload | null,
  permission: VendorPermissionKey,
  tournamentId?: string
): boolean {
  if (!session) return false;

  // Full access vendors have unrestricted permissions on all tournaments
  if (session.accessLevel === 'FULL_ACCESS') {
    return true;
  }

  // Limited access vendors: verify tournament assignment if specific tournament is targeted
  if (tournamentId) {
    const isAssigned =
      session.assignedTournaments.includes('ALL') ||
      session.assignedTournaments.includes(tournamentId);
    if (!isAssigned) return false;
  }

  const perms = session.permissions || [];

  // Alias compatibility checks
  if (permission === 'manage_own_slots' || permission === 'manage_room_details') {
    return perms.includes('manage_own_slots') || perms.includes('manage_room_details');
  }
  if (permission === 'submit_results' || permission === 'enter_match_results') {
    return perms.includes('submit_results') || perms.includes('enter_match_results');
  }
  if (permission === 'create_tournaments' || permission === 'manage_tournaments') {
    return perms.includes('create_tournaments') || perms.includes('manage_tournaments');
  }

  // Check if specific permission is granted
  return perms.includes(permission);
}

export function isVendorTournamentAccessible(
  session: VendorSessionPayload | null,
  tournamentId: string
): boolean {
  if (!session) return false;
  if (session.accessLevel === 'FULL_ACCESS') return true;
  return (
    session.assignedTournaments.includes('ALL') ||
    session.assignedTournaments.includes(tournamentId)
  );
}

export async function authenticateVendor(identifier: string, password: string) {
  const cleanIdent = identifier.trim().toLowerCase();
  const cleanPass = password.trim();

  if (!cleanIdent || !cleanPass) {
    return { ok: false, status: 400, message: 'Vendor ID/Email and password are required.' };
  }

  // 1. Try Supabase query
  try {
    const { data: vendor, error } = await supabaseAdmin
      .from('VendorAccount')
      .select('*')
      .or(`vendorId.ilike.${cleanIdent},email.ilike.${cleanIdent}`)
      .maybeSingle();

    if (vendor && !error) {
      if (vendor.status === 'SUSPENDED') {
        return {
          ok: false,
          status: 403,
          message: 'This vendor account has been suspended by administration.',
        };
      }

      let passwordMatches = false;
      if (vendor.passwordHash) {
        passwordMatches = await bcrypt.compare(cleanPass, vendor.passwordHash);
      }
      if (!passwordMatches && vendor.password) {
        passwordMatches = vendor.password === cleanPass;
      }

      if (passwordMatches) {
        const token = createVendorToken(vendor as VendorAccount);
        return {
          ok: true,
          status: 200,
          vendor: {
            id: vendor.id,
            vendorId: vendor.vendorId,
            name: vendor.name,
            email: vendor.email,
            accessLevel: vendor.accessLevel,
            permissions: vendor.permissions,
            assignedTournaments: vendor.assignedTournaments,
          },
          token,
        };
      }
    }
  } catch (err) {
    console.warn('[authenticateVendor] Supabase check warning:', err);
  }

  // 2. Fallback to LocalDatabase / Mock accounts
  const localVendors = db.getVendors ? db.getVendors() : [];
  const localMatch = localVendors.find(
    (v) =>
      (v.vendorId.toLowerCase() === cleanIdent || v.email.toLowerCase() === cleanIdent) &&
      (v.password === cleanPass || cleanPass === 'vendor123')
  );

  if (localMatch) {
    if (localMatch.status === 'SUSPENDED') {
      return {
        ok: false,
        status: 403,
        message: 'This vendor account has been suspended by administration.',
      };
    }
    const token = createVendorToken(localMatch);
    return {
      ok: true,
      status: 200,
      vendor: {
        id: localMatch.id,
        vendorId: localMatch.vendorId,
        name: localMatch.name,
        email: localMatch.email,
        accessLevel: localMatch.accessLevel,
        permissions: localMatch.permissions,
        assignedTournaments: localMatch.assignedTournaments,
      },
      token,
    };
  }

  // 3. Demo fallback support for default "vendor@helian.gg" / "vendor123"
  if ((cleanIdent === 'vendor@helian.gg' || cleanIdent === 'vendor' || cleanIdent === 'vnd-demo') && cleanPass === 'vendor123') {
    const demoVendor: VendorAccount = {
      id: 'vendor_demo_01',
      vendorId: 'VND-DEMO',
      name: 'Blackrock Host Vendor',
      email: 'vendor@helian.gg',
      status: 'ACTIVE',
      accessLevel: 'FULL_ACCESS',
      permissions: [
        'manage_room_details',
        'enter_match_results',
        'view_registrations',
        'manage_tournaments',
        'view_analytics',
      ],
      assignedTournaments: ['ALL'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const token = createVendorToken(demoVendor);
    return {
      ok: true,
      status: 200,
      vendor: {
        id: demoVendor.id,
        vendorId: demoVendor.vendorId,
        name: demoVendor.name,
        email: demoVendor.email,
        accessLevel: demoVendor.accessLevel,
        permissions: demoVendor.permissions,
        assignedTournaments: demoVendor.assignedTournaments,
      },
      token,
    };
  }

  return { ok: false, status: 401, message: 'Invalid Vendor ID or password.' };
}

export function createVendorSessionCookie(token: string) {
  return {
    name: 'vendor_session',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export function clearVendorCookies() {
  return [
    {
      name: 'vendor_session',
      value: '',
      path: '/',
      expires: new Date(0),
    },
  ];
}
