import { z } from 'zod';
import prisma from '@/lib/db';
import { comparePassword, createSession, clientMeta } from '@/lib/auth';
import { ok, fail, handleError, readJson, validate, assertSameOrigin } from '@/lib/api';
import { rateLimit } from '@/lib/ratelimit';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  identifier: z.string().min(3, 'ایمیل یا شماره موبایل را وارد کنید.').max(120),
  password: z.string().min(1, 'رمز عبور را وارد کنید.').max(200),
});

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(req) {
  try {
    await assertSameOrigin();
    const meta = await clientMeta();

    // محدودیت نرخ بر اساس IP
    const rl = await rateLimit(`login:${meta.ip}`, { limit: 10, windowMs: 10 * 60_000 });
    if (!rl.ok) {
      await logAudit({ action: 'محدودسازی نرخ ورود', entity: 'Auth', severity: 'WARN', ip: meta.ip, userAgent: meta.userAgent });
      return fail(`تلاش‌های زیاد. لطفاً ${rl.retryAfter} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(req);
    const { identifier, password } = validate(schema, body);
    const id = identifier.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: id }, { phone: identifier.trim() }] },
    });

    // پیام یکسان برای جلوگیری از افشای وجود حساب (user enumeration)
    const GENERIC = 'ایمیل/موبایل یا رمز عبور نادرست است.';

    if (!user || !user.isActive) {
      await logAudit({ action: 'تلاش ناموفق برای ورود', entity: 'Auth', severity: 'WARN', ip: meta.ip, userAgent: meta.userAgent, after: { identifier: id } });
      return fail(GENERIC, 401);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil - new Date()) / 60000);
      return fail(`حساب شما موقتاً قفل شده است. ${mins} دقیقه دیگر تلاش کنید.`, 423);
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      const failed = user.failedLogins + 1;
      const lock = failed >= MAX_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
        },
      });
      await logAudit({
        userId: user.id,
        actorName: user.name,
        action: lock ? 'مسدودسازی بر اثر تلاش مکرر ورود' : 'تلاش ناموفق برای ورود',
        entity: 'Auth',
        severity: lock ? 'CRITICAL' : 'WARN',
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return fail(lock ? `حساب شما به‌مدت ${LOCK_MINUTES} دقیقه قفل شد.` : GENERIC, lock ? 423 : 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await createSession(user, meta);
    await logAudit({
      userId: user.id,
      actorName: user.name,
      action: user.role === 'ADMIN' ? 'ورود موفق مدیر' : 'ورود موفق کاربر',
      entity: 'Auth',
      severity: user.role === 'ADMIN' ? 'WARN' : 'INFO',
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ user: { id: user.id, name: user.name, role: user.role, email: user.email } });
  } catch (e) {
    if (e?.status === 400) return fail(e.userMessage || e.message, 400);
    return handleError(e);
  }
}
