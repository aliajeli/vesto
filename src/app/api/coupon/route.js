import { z } from 'zod';
import { getCurrentUser, clientMeta } from '@/lib/auth';
import { ok, fail, handleError, assertCsrf, readJson, validate } from '@/lib/api';
import { priceCart, validateCoupon } from '@/lib/pricing';
import { getSettings } from '@/lib/settings';
import { rateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  code: z.string().trim().min(2, 'کد تخفیف را وارد کنید.').max(24),
  items: z.array(z.object({
    variantId: z.string().optional().nullable(),
    productId: z.string().optional().nullable(),
    slug: z.string().optional().nullable(),
    size: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    quantity: z.number().int().min(1).max(100),
  })).min(1, 'سبد خرید خالی است.').max(50),
});

/** اعتبارسنجی کد تخفیف روی سبد فعلی — قیمت‌گذاری همیشه سمت سرور انجام می‌شود */
export async function POST(req) {
  try {
    await assertCsrf(req);
    const meta = await clientMeta();
    const rl = await rateLimit(`coupon:${meta.ip}`, { limit: 20, windowMs: 10 * 60_000 });
    if (!rl.ok) return fail(`تلاش‌های زیاد. ${rl.retryAfter} ثانیه دیگر تلاش کنید.`, 429);

    const body = await readJson(req);
    const { code, items } = validate(schema, body);

    const user = await getCurrentUser();
    const settings = await getSettings();

    // ابتدا سبد بدون کد قیمت‌گذاری می‌شود تا subtotal واقعی به‌دست آید
    const base = await priceCart({ items, couponCode: null, userId: user?.id || null, settings });
    if (!base.ok || !base.items?.length) return fail('سبد خرید شما خالی یا نامعتبر است.', 400);

    const res = await validateCoupon({ code, subtotal: base.subtotal, userId: user?.id || null });
    if (!res.ok) return fail(res.error, 400);

    // سبد نهایی با کد اعمال‌شده
    const priced = await priceCart({ items, couponCode: code, userId: user?.id || null, settings });

    return ok({
      cart: priced,
      coupon: {
        code: res.coupon.code,
        type: res.coupon.type,
        value: res.coupon.value,
        description: res.coupon.description || '',
        discount: res.discount,
      },
      message: `کد «${res.coupon.code}» اعمال شد.`,
    });
  } catch (e) {
    return handleError(e);
  }
}
