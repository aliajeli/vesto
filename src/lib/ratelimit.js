import 'server-only';
import prisma from './db';

/**
 * محدودسازی نرخ درخواست مبتنی بر دیتابیس (پایدار بین ری‌استارت‌ها).
 * برای مقیاس بالا می‌توان به Redis مهاجرت کرد؛ رابط یکسان است.
 */
export async function rateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    const existing = await prisma.rateLimit.findUnique({ where: { key } });

    if (!existing || existing.resetAt < now) {
      await prisma.rateLimit.upsert({
        where: { key },
        update: { count: 1, resetAt },
        create: { key, count: 1, resetAt },
      });
      return { ok: true, remaining: limit - 1, resetAt };
    }

    if (existing.count >= limit) {
      return {
        ok: false,
        remaining: 0,
        resetAt: existing.resetAt,
        retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }

    const updated = await prisma.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
    return { ok: true, remaining: Math.max(0, limit - updated.count), resetAt: updated.resetAt };
  } catch {
    // در صورت خطای دیتابیس، مسدود نکن (fail-open) اما لاگ بگیر
    return { ok: true, remaining: 0, resetAt };
  }
}

export async function cleanupRateLimits() {
  await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => {});
}
