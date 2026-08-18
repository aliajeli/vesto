import { z } from 'zod';
import prisma from '@/lib/db';
import { ok, fail, handleError, readJson, validate, assertSameOrigin } from '@/lib/api';
import { rateLimit } from '@/lib/ratelimit';
import { clientMeta } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const schema = z.object({ email: z.string().email('ایمیل معتبر نیست.').max(120) });

export async function POST(req) {
  try {
    await assertSameOrigin();
    const meta = await clientMeta();
    const rl = await rateLimit(`news:${meta.ip}`, { limit: 6, windowMs: 60 * 60_000 });
    if (!rl.ok) return fail('تعداد درخواست‌ها زیاد است.', 429);

    const { email } = validate(schema, await readJson(req));
    await prisma.newsletter
      .upsert({ where: { email: email.toLowerCase() }, update: {}, create: { email: email.toLowerCase() } })
      .catch(() => {});
    return ok();
  } catch (e) {
    if (e?.status === 400) return fail(e.userMessage || e.message, 400);
    return handleError(e);
  }
}
