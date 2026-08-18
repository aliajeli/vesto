import prisma from '@/lib/db';
import { ok, fail, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** اطلاعات حداقلی پرداخت برای صفحه‌ی شبیه‌ساز */
export async function GET(req) {
  try {
    const pid = req.nextUrl.searchParams.get('pid');
    if (!pid) return fail('شناسه پرداخت الزامی است.', 400);
    const p = await prisma.payment.findUnique({
      where: { id: pid },
      include: { order: { select: { orderNumber: true, grandTotal: true, status: true } } },
    });
    if (!p) return fail('پرداخت یافت نشد.', 404);
    return ok({
      payment: {
        id: p.id,
        gateway: p.gateway,
        amount: p.amount,
        status: p.status,
        orderNumber: p.order?.orderNumber,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
