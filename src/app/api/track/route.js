import prisma from '@/lib/db';
import { ok, fail, handleError } from '@/lib/api';
import { getCurrentUser, clientMeta } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

/**
 * پیگیری سفارش.
 * دسترسی: مالک سفارش (نشست فعال) یا تطابق شماره موبایل ثبت‌شده روی سفارش.
 * برای جلوگیری از شمارش/حدس شماره سفارش‌ها، نرخ درخواست محدود شده است.
 */
export async function GET(req) {
  try {
    const meta = await clientMeta();
    const rl = await rateLimit(`track:${meta.ip}`, { limit: 20, windowMs: 10 * 60_000 });
    if (!rl.ok) return fail('تعداد درخواست‌ها زیاد است. کمی صبر کنید.', 429);

    const sp = req.nextUrl.searchParams;
    const orderNumber = (sp.get('order') || '').trim();
    const phone = (sp.get('phone') || '').trim();
    if (!orderNumber) return fail('شماره سفارش الزامی است.', 400);

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true, address: true, user: { select: { id: true, phone: true } } },
    });

    const NOT_FOUND = 'سفارشی با این مشخصات یافت نشد.';
    if (!order) return fail(NOT_FOUND, 404);

    const user = await getCurrentUser();
    const isOwner = user && (user.role === 'ADMIN' || order.userId === user.id);
    const ownerPhone = order.guestPhone || order.user?.phone || order.address?.phone || '';
    const phoneMatches = phone && ownerPhone && phone === ownerPhone;

    if (!isOwner && !phoneMatches) {
      return fail('برای مشاهده این سفارش، شماره موبایل ثبت‌شده را وارد کنید.', 403);
    }

    return ok({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        trackingCode: order.trackingCode,
        subtotal: order.subtotal,
        discountTotal: order.discountTotal,
        taxTotal: order.taxTotal,
        shippingTotal: order.shippingTotal,
        grandTotal: order.grandTotal,
        items: order.items.map((i) => ({
          id: i.id,
          nameSnap: i.nameSnap,
          imageSnap: i.imageSnap,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
        })),
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
