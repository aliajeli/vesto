import 'server-only';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import prisma from './db';
import { AUTH_SECRET, sha256, randomToken } from './crypto';

const SESSION_COOKIE = 'vesto_session';
const CSRF_COOKIE = 'vesto_csrf';
const SESSION_DAYS = 7;
const key = new TextEncoder().encode(AUTH_SECRET);

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export async function hashPassword(pw) {
  return bcrypt.hash(pw, 12);
}

export async function comparePassword(pw, hash) {
  try {
    return await bcrypt.compare(pw, hash);
  } catch {
    return false;
  }
}

export function passwordIssues(pw) {
  const out = [];
  if (!pw || pw.length < 8) out.push('حداقل ۸ کاراکتر');
  if (!/[a-zA-Z]/.test(pw || '')) out.push('حداقل یک حرف انگلیسی');
  if (!/[0-9]/.test(pw || '')) out.push('حداقل یک رقم');
  return out;
}

async function signJwt(payload, expiresAt) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('vesto')
    .setAudience('vesto-app')
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(key);
}

export async function verifyJwt(token) {
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: 'vesto',
      audience: 'vesto-app',
    });
    return payload;
  } catch {
    return null;
  }
}

/** ساخت نشست: JWT در کوکی + رکورد قابل ابطال در دیتابیس */
export async function createSession(user, { ip, userAgent } = {}) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  const raw = randomToken(32);
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: sha256(raw),
      expiresAt,
      ip: ip || null,
      userAgent: (userAgent || '').slice(0, 300) || null,
    },
  });

  const jwt = await signJwt(
    { sub: user.id, sid: session.id, role: user.role, name: user.name, jti: sha256(raw).slice(0, 24) },
    expiresAt
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, jwt, { ...cookieOptions, expires: expiresAt });
  store.set(CSRF_COOKIE, randomToken(16), {
    ...cookieOptions,
    httpOnly: false,
    expires: expiresAt,
  });
  return session;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const payload = await verifyJwt(token);
    if (payload?.sid) {
      await prisma.session
        .update({ where: { id: payload.sid }, data: { revokedAt: new Date() } })
        .catch(() => {});
    }
  }
  store.delete(SESSION_COOKIE);
  store.delete(CSRF_COOKIE);
}

/** کاربر جاری با اعتبارسنجی نشست در دیتابیس (پس ابطال آنی ممکن است) */
export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  if (!payload?.sub || !payload?.sid) return null;

  const session = await prisma.session
    .findUnique({ where: { id: payload.sid }, include: { user: true } })
    .catch(() => null);

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (!session.user || !session.user.isActive) return null;
  if (session.userId !== payload.sub) return null;

  const { passwordHash, totpSecret, ...safe } = session.user;
  return safe;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw Object.assign(new Error('UNAUTHENTICATED'), { status: 401 });
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
  }
  return user;
}

export async function isAdmin() {
  const u = await getCurrentUser();
  return !!u && u.role === 'ADMIN';
}

export async function clientMeta() {
  const h = await headers();
  return {
    ip:
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      h.get('x-real-ip') ||
      'unknown',
    userAgent: h.get('user-agent') || 'unknown',
  };
}

export { SESSION_COOKIE, CSRF_COOKIE };
