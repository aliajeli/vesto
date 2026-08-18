import { z } from 'zod';
import prisma from '@/lib/db';
import { hashPassword, createSession, clientMeta, passwordIssues } from '@/lib/auth';
import { ok, fail, handleError, readJson, validate, assertSameOrigin, sanitizeText } from '@/lib/api';
import { rateLimit } from '@/lib/ratelimit';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد.').max(60),
  email: z.string().email('ایمیل معتبر نیست.').max(120).optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^09\d{9}$/, 'شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد.')
    .optional()
    .or(z.literal('')),
  password: z.string().min(8, 'رمز عبور حداقل ۸ کاراکتر باشد.').max(200),
});

export async function POST(req) {
  try {
    await assertSameOrigin();
    const meta = await clientMeta();
    const rl = await rateLimit(`register:${meta.ip}`, { limit: 5, windowMs: 30 * 60_000 });
    if (!rl.ok) return fail('تعداد تلاش‌ها زیاد است. بعداً امتحان کنید.', 429);

    const body = await readJson(req);
    const data = validate(schema, body);

    if (!data.email && !data.phone) return fail('ایمیل یا شماره موبایل الزامی است.', 400);

    const issues = passwordIssues(data.password);
    if (issues.length) return fail(`رمز عبور ضعیف است: ${issues.join('، ')}`, 400);

    const email = data.email ? data.email.trim().toLowerCase() : null;
    const phone = data.phone ? data.phone.trim() : null;

    const exists = await prisma.user.findFirst({
      where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
    });
    if (exists) return fail('کاربری با این ایمیل یا موبایل قبلاً ثبت شده است.', 409);

    const user = await prisma.user.create({
      data: {
        name: sanitizeText(data.name, 60),
        email,
        phone,
        passwordHash: await hashPassword(data.password),
        role: 'CUSTOMER',
      },
    });

    await createSession(user, meta);
    await logAudit({ userId: user.id, actorName: user.name, action: 'ثبت‌نام کاربر جدید', entity: 'User', entityId: user.id, ip: meta.ip, userAgent: meta.userAgent });

    return ok({ user: { id: user.id, name: user.name, role: user.role } });
  } catch (e) {
    if (e?.status === 400) return fail(e.userMessage || e.message, 400);
    return handleError(e);
  }
}
