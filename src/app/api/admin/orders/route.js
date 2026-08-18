import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdmin, clientMeta } from '@/lib/auth';
import { ok, fail, handleError, assertCsrf, readJson, validate, sanitizeText } from '@/lib/api';
import { logAudit, postLedger } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const PAID_STATES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

// انتقال‌های مجاز وضعیت — جلوگیری از تغییرات نامعتبر
const ALLOWED = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'SHIPPED', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

const schema = z.object({
  id: z.string().min(1),
  status: z.enum(STATUSES).optional(),
  trackingCode: z.string().trim().max(60).optional(),
  note: z.string().max(1000).optional(),
});

export async function PATCH(req) {
  try {
    const admin = await requireAdmin();
    await assertCsrf(req);
    const body = await readJson(req);
    const d = validate(schema, body);

    const order = await prisma.order.findUnique({
      where: { id: d.id },
      include: { items: { select: { productId: true, size: true, color: true, quantity: true } } },
    });
    if (!order) return fail('سفارش یافت نشد.', 404);

    const data = {};
    if (d.trackingCode !== undefined) data.trackingCode = sanitizeText(d.trackingCode, 60) || null;
    if (d.note !== undefined) data.note = sanitizeText(d.note, 1000) || null;

    let statusChanged = false;
    if (d.status && d.status !== order.status) {
      if (!ALLOWED[order.status]?.includes(d.status)) {
        return fail(`تغییر وضعیت از «${order.status}» به «${d.status}» مجاز نیست.`, 400);
      }
      data.status = d.status;
      statusChanged = true;
      if (d.status === 'PAID' && !order.paidAt) data.paidAt = new Date();
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: d.id }, data });

      // بازگرداندن موجودی هنگام لغو یا مرجوعی
      if (statusChanged && (d.status === 'CANCELLED' || d.status === 'REFUNDED')) {
        for (const it of order.items) {
          if (!it.productId) continue;
          await tx.productVariant.updateMany({
            where: { productId: it.productId, size: it.size || undefined, color: it.color || undefined },
            data: { stock: { increment: it.quantity } },
          });
        }
      }

      // سند حسابداری استرداد
      if (statusChanged && d.status === 'REFUNDED' && PAID_STATES.includes(order.status)) {
        await postLedger([
          { type: 'REFUND', account: 'استرداد فروش', debit: order.grandTotal, credit: 0, refType: 'ORDER', refId: order.id, description: `استرداد سفارش ${order.orderNumber}` },
          { type: 'REFUND', account: 'وجه نقد / بانک', debit: 0, credit: order.grandTotal, refType: 'ORDER', refId: order.id, description: `استرداد سفارش ${order.orderNumber}` },
        ], tx);
      }
    });

    const meta = await clientMeta();
    await logAudit({
      userId: admin.id, actorName: admin.name,
      action: statusChanged ? 'تغییر وضعیت سفارش' : 'ویرایش سفارش',
      entity: 'Order', entityId: d.id,
      severity: statusChanged && ['CANCELLED', 'REFUNDED'].includes(d.status) ? 'CRITICAL' : 'INFO',
      before: JSON.stringify({ status: order.status, trackingCode: order.trackingCode }),
      after: JSON.stringify(data), ...meta,
    });

    return ok();
  } catch (e) {
    return handleError(e);
  }
}
