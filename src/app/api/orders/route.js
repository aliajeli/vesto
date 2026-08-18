import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { parseJsonArray } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

/** سفارش‌های کاربر واردشده — هر کاربر فقط سفارش‌های خودش را می‌بیند */
export async function GET(req) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const number = searchParams.get('number');

    // جزئیات یک سفارش
    if (id || number) {
      const order = await prisma.order.findFirst({
        where: {
          userId: user.id, // مالکیت اجباری — جلوگیری از IDOR
          ...(id ? { id } : { orderNumber: number }),
        },
        include: {
          items: true,
          address: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            select: { gateway: true, amount: true, status: true, refId: true, cardPan: true, verifiedAt: true, createdAt: true },
          },
        },
      });
      if (!order) return fail('سفارش یافت نشد.', 404);

      return ok({
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          createdAt: order.createdAt,
          paidAt: order.paidAt,
          subtotal: order.subtotal,
          discountTotal: order.discountTotal,
          shippingTotal: order.shippingTotal,
          taxTotal: order.taxTotal,
          grandTotal: order.grandTotal,
          couponCode: order.couponCode,
          trackingCode: order.trackingCode,
          shippingMethod: order.shippingMethod,
          address: order.address
            ? {
                fullName: order.address.fullName, phone: order.address.phone,
                province: order.address.province, city: order.address.city,
                postalCode: order.address.postalCode, line1: order.address.line1,
              }
            : null,
          items: order.items.map((i) => ({
            id: i.id, name: i.nameSnap, image: i.imageSnap, size: i.size, color: i.color,
            unitPrice: i.unitPrice, quantity: i.quantity, lineTotal: i.lineTotal,
          })),
          payments: order.payments,
        },
      });
    }

    // فهرست سفارش‌ها
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 10)));
    const status = searchParams.get('status') || '';

    const where = { userId: user.id, ...(status ? { status } : {}) };

    const [rows, total] = await Promise.all([
      prisma.order.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: { items: { select: { id: true, nameSnap: true, imageSnap: true, quantity: true } } },
      }),
      prisma.order.count({ where }),
    ]);

    return ok({
      items: rows.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        createdAt: o.createdAt,
        grandTotal: o.grandTotal,
        trackingCode: o.trackingCode,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        preview: o.items.slice(0, 4).map((i) => ({ id: i.id, name: i.nameSnap, image: i.imageSnap })),
      })),
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    return handleError(e);
  }
}
