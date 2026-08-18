import { z } from 'zod';
import prisma from '@/lib/db';
import { priceCart } from '@/lib/pricing';
import { getSettings } from '@/lib/settings';
import { getCurrentUser, clientMeta } from '@/lib/auth';
import { ok, fail, handleError, readJson, validate, assertCsrf, sanitizeText } from '@/lib/api';
import { generateOrderNumber, signPayment } from '@/lib/crypto';
import { createGatewayPayment, gatewayIsConfigured } from '@/lib/gateways';
import { rateLimit } from '@/lib/ratelimit';
import { logAudit } from '@/lib/audit';

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
    .min(1, 'سبد خرید خالی است.')
    .max(50),
  couponCode: z.string().max(40).nullable().optional(),
  gateway: z.enum(['sandbox', 'zibal', 'zarinpal', 'payping']).optional(),
  shippingMethod: z.enum(['standard', 'express']).default('standard'),
  note: z.string().max(500).optional().or(z.literal('')),
  addressId: z.string().max(60).optional().or(z.literal('')),
  guest: z
    .object({
      fullName: z.string().min(2, 'نام و نام خانوادگی را وارد کنید.').max(60),
      phone: z.string().regex(/^09\d{9}$/, 'شماره موبایل معتبر نیست.'),
      province: z.string().min(2, 'استان را وارد کنید.').max(40),
      city: z.string().min(2, 'شهر را وارد کنید.').max(40),
      postalCode: z.string().regex(/^\d{10}$/, 'کد پستی باید ۱۰ رقم باشد.'),
      line1: z.string().min(5, 'نشانی را کامل وارد کنید.').max(300),
    })
    .optional(),
});

/**
 * ایجاد سفارش + شروع پرداخت.
 *
 * تضمین‌های امنیتی:
 *  • مبلغ نهایی فقط از دیتابیس محاسبه می‌شود (priceCart) — کلاینت قیمت نمی‌فرستد.
 *  • موجودی در همان تراکنش قفل و کسر می‌شود تا فروش بیش از موجودی رخ ندهد.
 *  • برای هر پرداخت یک امضای HMAC از (سفارش + مبلغ + درگاه) ذخیره می‌شود.
 */
export async function POST(req) {
  try {
    await assertCsrf(req);
    const meta = await clientMeta();

    const rl = await rateLimit(`checkout:${meta.ip}`, { limit: 12, windowMs: 10 * 60_000 });
    if (!rl.ok) return fail('تعداد درخواست‌های پرداخت زیاد است. کمی صبر کنید.', 429);

    const data = validate(schema, await readJson(req));
    const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);

    if (settings.maintenanceMode) return fail('فروشگاه در حال به‌روزرسانی است.', 503);
    if (!user && !settings.allowGuestCheckout) return fail('برای ثبت سفارش باید وارد شوید.', 401);
    if (!user && !data.guest) return fail('اطلاعات گیرنده را کامل کنید.', 400);

    // ---- قیمت‌گذاری سمت سرور
    const priced = await priceCart({
      items: data.items,
      couponCode: data.couponCode || null,
      userId: user?.id || null,
      settings,
    });
    if (!priced.ok) return fail(priced.errors?.[0] || 'سبد خرید نامعتبر است.', 400);
    if (priced.grandTotal < 10000) return fail('مبلغ سفارش نامعتبر است.', 400);

    // ---- انتخاب درگاه
    let gateway = data.gateway || settings.activeGateway || 'sandbox';
    if (!gatewayIsConfigured(gateway, settings)) {
      if (settings.gatewaySandbox) gateway = 'sandbox';
      else return fail('درگاه پرداخت انتخاب‌شده پیکربندی نشده است.', 400);
    }

    // ---- آدرس
    let addressId = null;
    if (user && data.addressId) {
      const addr = await prisma.address.findFirst({ where: { id: data.addressId, userId: user.id } });
      if (!addr) return fail('نشانی انتخاب‌شده معتبر نیست.', 400);
      addressId = addr.id;
    } else if (user && data.guest) {
      const created = await prisma.address.create({
        data: {
          userId: user.id,
          fullName: sanitizeText(data.guest.fullName, 60),
          phone: data.guest.phone,
          province: sanitizeText(data.guest.province, 40),
          city: sanitizeText(data.guest.city, 40),
          postalCode: data.guest.postalCode,
          line1: sanitizeText(data.guest.line1, 300),
        },
      });
      addressId = created.id;
    }

    // ---- تراکنش اتمیک: کسر موجودی + ایجاد سفارش
    const order = await prisma.$transaction(async (tx) => {
      for (const it of priced.items) {
        if (!it.variantId) continue;
        const res = await tx.productVariant.updateMany({
          where: { id: it.variantId, stock: { gte: it.quantity } },
          data: { stock: { decrement: it.quantity } },
        });
        if (res.count === 0) {
          throw Object.assign(new Error(`موجودی «${it.name}» کافی نیست.`), { status: 409, userMessage: `موجودی «${it.name}» کافی نیست.` });
        }
      }

      const g = data.guest;
      return tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: user?.id || null,
          addressId,
          guestName: !user && g ? sanitizeText(g.fullName, 60) : null,
          guestPhone: !user && g ? g.phone : null,
          guestAddress: !user && g ? sanitizeText(`${g.province}، ${g.city}، ${g.line1} — کدپستی ${g.postalCode}`, 400) : null,
          status: 'PENDING',
          subtotal: priced.subtotal,
          discountTotal: priced.discountTotal,
          shippingTotal: priced.shippingTotal,
          taxTotal: priced.taxTotal,
          grandTotal: priced.grandTotal,
          costTotal: priced.costTotal,
          couponCode: priced.coupon?.code || null,
          note: data.note ? sanitizeText(data.note, 500) : null,
          shippingMethod: data.shippingMethod,
          items: {
            create: priced.items.map((i) => ({
              productId: i.productId,
              nameSnap: i.name,
              imageSnap: i.image,
              size: i.size,
              color: i.color,
              unitPrice: i.unitPrice,
              costPrice: i.costPrice,
              quantity: i.quantity,
              lineTotal: i.lineTotal,
            })),
          },
        },
      });
    });

    // ---- ایجاد رکورد پرداخت با امضای سرور
    const serverHash = signPayment({ orderId: order.id, amount: order.grandTotal, gateway });
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        gateway,
        amount: order.grandTotal,
        status: 'INITIATED',
        serverHash,
        idempotencyKey: `${order.id}:${gateway}:${order.grandTotal}`,
      },
    });

    const origin = req.nextUrl.origin;
    const callbackUrl = `${origin}/api/payment/verify?pid=${payment.id}`;

    const gw = await createGatewayPayment({
      gateway,
      settings,
      amountRial: order.grandTotal,
      orderId: order.orderNumber,
      paymentId: payment.id,
      callbackUrl,
      description: `سفارش ${order.orderNumber} — ${settings.storeNameFa || 'وستو'}`,
      mobile: user?.phone || data.guest?.phone,
      email: user?.email,
    });

    if (!gw.ok) {
      // بازگرداندن موجودی در صورت شکست اتصال به درگاه
      await prisma.$transaction(async (tx) => {
        for (const it of priced.items) {
          if (it.variantId) await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } }).catch(() => {});
        }
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failReason: String(gw.error).slice(0, 300) } });
        await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
      });
      await logAudit({ userId: user?.id, action: 'خطا در اتصال به درگاه پرداخت', entity: 'Payment', entityId: payment.id, severity: 'CRITICAL', ip: meta.ip, after: { error: String(gw.error) } });
      return fail('اتصال به درگاه پرداخت ممکن نشد. لطفاً درگاه دیگری را امتحان کنید.', 502);
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PENDING', authority: gw.authority, callbackRaw: JSON.stringify(gw.raw || {}).slice(0, 2000) },
    });

    await logAudit({
      userId: user?.id || null,
      actorName: user?.name || 'مهمان',
      action: 'ثبت سفارش و شروع پرداخت',
      entity: 'Order',
      entityId: order.id,
      after: { orderNumber: order.orderNumber, amount: order.grandTotal, gateway },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentId: payment.id,
      redirectUrl: gw.redirectUrl,
      amount: order.grandTotal,
      gateway,
    });
  } catch (e) {
    if (e?.status === 400 || e?.status === 409) return fail(e.userMessage || e.message, e.status);
    return handleError(e);
  }
}
