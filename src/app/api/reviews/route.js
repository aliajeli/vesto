import { z } from 'zod';
import prisma from '@/lib/db';
import { requireUser, getCurrentUser, clientMeta } from '@/lib/auth';
import { ok, fail, handleError, assertCsrf, readJson, validate, sanitizeText } from '@/lib/api';
import { rateLimit } from '@/lib/ratelimit';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const PAID = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const schema = z.object({
  productId: z.string().min(1, 'محصول مشخص نشده است.'),
  rating: z.number().int().min(1, 'امتیاز باید بین ۱ تا ۵ باشد.').max(5, 'امتیاز باید بین ۱ تا ۵ باشد.'),
  title: z.string().trim().max(80).optional().default(''),
  body: z.string().trim().min(10, 'متن نظر باید حداقل ۱۰ نویسه باشد.').max(1500),
});

/** فهرست نظرات تأییدشده یک محصول */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const slug = searchParams.get('slug');
    if (!productId && !slug) return fail('محصول مشخص نشده است.', 400);

    const product = await prisma.product.findFirst({
      where: productId ? { id: productId } : { slug },
      select: { id: true, ratingAvg: true, ratingCount: true },
    });
    if (!product) return fail('محصول یافت نشد.', 404);

    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 10)));

    const [rows, total, dist] = await Promise.all([
      prisma.review.findMany({
        where: { productId: product.id, isApproved: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { name: true } } },
      }),
      prisma.review.count({ where: { productId: product.id, isApproved: true } }),
      prisma.review.groupBy({ by: ['rating'], where: { productId: product.id, isApproved: true }, _count: true }),
    ]);

    const dmap = Object.fromEntries(dist.map((d) => [d.rating, d._count]));
    const user = await getCurrentUser();
    const mine = user
      ? await prisma.review.findFirst({ where: { productId: product.id, userId: user.id }, select: { id: true, rating: true, isApproved: true } })
      : null;

    return ok({
      items: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title || '',
        body: r.body,
        author: maskName(r.user?.name || 'کاربر وستو'),
        createdAt: r.createdAt,
      })),
      total, page, pages: Math.ceil(total / limit) || 1,
      summary: {
        average: product.ratingAvg,
        count: product.ratingCount,
        distribution: [5, 4, 3, 2, 1].map((n) => ({ rating: n, count: dmap[n] || 0 })),
      },
      myReview: mine,
    });
  } catch (e) {
    return handleError(e);
  }
}

/** ثبت نظر جدید — فقط خریداران واقعی، یک نظر برای هر محصول */
export async function POST(req) {
  try {
    const user = await requireUser();
    await assertCsrf(req);

    const meta = await clientMeta();
    const rl = await rateLimit(`review:${user.id}`, { limit: 5, windowMs: 60 * 60_000 });
    if (!rl.ok) return fail(`تعداد نظرات ارسالی زیاد است. ${rl.retryAfter} ثانیه دیگر تلاش کنید.`, 429);

    const body = await readJson(req);
    const d = validate(schema, body);

    const product = await prisma.product.findUnique({ where: { id: d.productId }, select: { id: true, name: true } });
    if (!product) return fail('محصول یافت نشد.', 404);

    // فقط خریدار واقعی می‌تواند نظر بدهد (جلوگیری از نظرات جعلی)
    const purchased = await prisma.orderItem.findFirst({
      where: { productId: product.id, order: { userId: user.id, status: { in: PAID } } },
      select: { id: true },
    });
    if (!purchased) return fail('فقط خریداران این محصول می‌توانند نظر ثبت کنند.', 403);

    const existing = await prisma.review.findFirst({ where: { productId: product.id, userId: user.id }, select: { id: true } });
    if (existing) return fail('شما قبلاً برای این محصول نظر ثبت کرده‌اید.', 409);

    const review = await prisma.review.create({
      data: {
        productId: product.id,
        userId: user.id,
        rating: d.rating,
        title: sanitizeText(d.title, 80) || null,
        body: sanitizeText(d.body, 1500),
        isApproved: false, // انتشار پس از تأیید مدیر
      },
    });

    await logAudit({
      userId: user.id, actorName: user.name, action: 'ثبت نظر جدید',
      entity: 'Review', entityId: review.id, severity: 'INFO',
      after: JSON.stringify({ product: product.name, rating: d.rating }),
      ip: meta.ip, userAgent: meta.userAgent,
    });

    return ok({ message: 'نظر شما ثبت شد و پس از تأیید مدیر نمایش داده می‌شود.', id: review.id });
  } catch (e) {
    return handleError(e);
  }
}

/** نمایش نام به‌صورت نیمه‌مخفی برای حفظ حریم خصوصی */
function maskName(name) {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
