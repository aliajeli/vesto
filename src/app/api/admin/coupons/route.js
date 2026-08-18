import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdmin, clientMeta } from '@/lib/auth';
import { ok, fail, handleError, assertCsrf, readJson, validate, sanitizeText } from '@/lib/api';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(3, 'کد تخفیف باید حداقل ۳ نویسه باشد.').max(24).regex(/^[A-Za-z0-9_-]+$/, 'کد فقط می‌تواند شامل حروف انگلیسی، عدد، خط تیره و زیرخط باشد.'),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number().int().positive('مقدار تخفیف باید بزرگ‌تر از صفر باشد.'),
  minSubtotal: z.number().int().min(0).default(0),
  maxDiscount: z.number().int().min(0).optional().nullable(),
  usageLimit: z.number().int().min(0).optional().nullable(),
  perUserLimit: z.number().int().min(0).max(100).default(1),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  description: z.string().max(200).optional().default(''),
});

export async function POST(req) {
  try {
    const admin = await requireAdmin();
    await assertCsrf(req);
    const body = await readJson(req);
    const d = validate(schema, body);

    const code = d.code.trim().toUpperCase();
    if (d.type === 'PERCENT' && d.value > 100) return fail('درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.', 400);

    const dup = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
    if (dup && dup.id !== d.id) return fail('کد تخفیفی با این نام قبلاً ثبت شده است.', 409);

    const startsAt = d.startsAt ? new Date(d.startsAt) : null;
    const endsAt = d.endsAt ? new Date(d.endsAt) : null;
    if (startsAt && endsAt && startsAt > endsAt) return fail('تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.', 400);

    const data = {
      code, type: d.type, value: d.value,
      minSubtotal: d.minSubtotal,
      maxDiscount: d.maxDiscount || null,
      usageLimit: d.usageLimit || null,
      perUserLimit: d.perUserLimit,
      startsAt, endsAt,
      isActive: d.isActive,
      description: sanitizeText(d.description, 200) || null,
    };

    const coupon = d.id
      ? await prisma.coupon.update({ where: { id: d.id }, data })
      : await prisma.coupon.create({ data });

    const meta = await clientMeta();
    await logAudit({
      userId: admin.id, actorName: admin.name,
      action: d.id ? 'ویرایش کد تخفیف' : 'ساخت کد تخفیف', entity: 'Coupon', entityId: coupon.id,
      severity: 'INFO', after: JSON.stringify({ code, type: d.type, value: d.value }), ...meta,
    });
    return ok({ coupon });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req) {
  try {
    const admin = await requireAdmin();
    await assertCsrf(req);
    const { id, isActive } = await readJson(req);
    if (!id) return fail('شناسه ارسال نشده است.', 400);
    await prisma.coupon.update({ where: { id }, data: { isActive: !!isActive } });
    const meta = await clientMeta();
    await logAudit({ userId: admin.id, actorName: admin.name, action: 'تغییر وضعیت کد تخفیف', entity: 'Coupon', entityId: id, severity: 'INFO', after: JSON.stringify({ isActive: !!isActive }), ...meta });
    return ok();
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req) {
  try {
    const admin = await requireAdmin();
    await assertCsrf(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return fail('شناسه ارسال نشده است.', 400);

    const c = await prisma.coupon.findUnique({ where: { id } });
    if (!c) return fail('کد تخفیف یافت نشد.', 404);
    if (c.usedCount > 0) {
      await prisma.coupon.update({ where: { id }, data: { isActive: false } });
      const meta = await clientMeta();
      await logAudit({ userId: admin.id, actorName: admin.name, action: 'غیرفعال‌سازی کد تخفیف', entity: 'Coupon', entityId: id, severity: 'WARN', before: JSON.stringify({ code: c.code }), ...meta });
      return ok({ archived: true, message: 'این کد در سفارش‌ها استفاده شده؛ به‌جای حذف غیرفعال شد.' });
    }

    await prisma.coupon.delete({ where: { id } });
    const meta = await clientMeta();
    await logAudit({ userId: admin.id, actorName: admin.name, action: 'حذف کد تخفیف', entity: 'Coupon', entityId: id, severity: 'WARN', before: JSON.stringify({ code: c.code }), ...meta });
    return ok({ archived: false });
  } catch (e) {
    return handleError(e);
  }
}
