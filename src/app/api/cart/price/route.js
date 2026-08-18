import { z } from 'zod';
import { priceCart } from '@/lib/pricing';
import { getSettings } from '@/lib/settings';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError, readJson, validate, assertSameOrigin } from '@/lib/api';

export const dynamic = 'force-dynamic';

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(60),
        variantId: z.string().max(60).nullable().optional(),
        quantity: z.number().int().min(1).max(50),
      })
    )
    .max(50),
  couponCode: z.string().max(40).nullable().optional(),
});

/** محاسبه‌ی قیمت سبد در سرور — کلاینت هیچ قیمتی ارسال نمی‌کند */
export async function POST(req) {
  try {
    await assertSameOrigin();
    const data = validate(schema, await readJson(req));
    const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
    const res = await priceCart({
      items: data.items,
      couponCode: data.couponCode || null,
      userId: user?.id || null,
      settings,
    });
    if (!res.ok) return fail(res.errors?.[0] || 'سبد خرید نامعتبر است.', 400);
    return ok({ cart: res });
  } catch (e) {
    if (e?.status === 400) return fail(e.userMessage || e.message, 400);
    return handleError(e);
  }
}
