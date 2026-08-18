import prisma from '@/lib/db';
import { requireAdmin, clientMeta } from '@/lib/auth';
import { ok, fail, handleError, assertCsrf, readJson } from '@/lib/api';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** میانگین امتیاز محصول را از نظرات تأییدشده بازمحاسبه می‌کند */
async function recalc(productId, tx = prisma) {
  const agg = await tx.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: true,
  });
  await tx.product.update({
    where: { id: productId },
    data: {
      ratingAvg: Math.round((agg._avg.rating || 0) * 10) / 10,
      ratingCount: agg._count || 0,
    },
  });
}

export async function PATCH(req) {
  try {
    const admin = await requireAdmin();
    await assertCsrf(req);
    const { id, ids, isApproved } = await readJson(req);
    const list = Array.isArray(ids) && ids.length ? ids : id ? [id] : [];
    if (!list.length) return fail('شناسه نظر ارسال نشده است.', 400);

    const reviews = await prisma.review.findMany({ where: { id: { in: list } }, select: { id: true, productId: true } });
    if (!reviews.length) return fail('نظری یافت نشد.', 404);

    await prisma.review.updateMany({ where: { id: { in: list } }, data: { isApproved: !!isApproved } });
    for (const pid of [...new Set(reviews.map((r) => r.productId))]) await recalc(pid);

    const meta = await clientMeta();
    await logAudit({
      userId: admin.id, actorName: admin.name,
      action: isApproved ? 'تأیید نظر' : 'لغو انتشار نظر',
      entity: 'Review', entityId: list.join(','), severity: 'INFO',
      after: JSON.stringify({ count: list.length, isApproved: !!isApproved }), ...meta,
    });
    return ok({ count: list.length });
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
    if (!id) return fail('شناسه نظر ارسال نشده است.', 400);

    const r = await prisma.review.findUnique({ where: { id }, select: { productId: true, body: true } });
    if (!r) return fail('نظر یافت نشد.', 404);

    await prisma.review.delete({ where: { id } });
    await recalc(r.productId);

    const meta = await clientMeta();
    await logAudit({ userId: admin.id, actorName: admin.name, action: 'حذف نظر', entity: 'Review', entityId: id, severity: 'WARN', before: JSON.stringify({ body: r.body.slice(0, 120) }), ...meta });
    return ok();
  } catch (e) {
    return handleError(e);
  }
}
