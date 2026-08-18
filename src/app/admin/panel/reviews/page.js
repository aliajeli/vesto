import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { PageHeader, StatCard } from '@/components/admin/AdminUI';
import ReviewsManager from '@/components/admin/ReviewsManager';
import { ChartCard, BarsChart } from '@/components/admin/Charts';
import { toFaDigits, groupDigits } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'مدیریت نظرات' };

function safeJson(s) {
  try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}

export default async function ReviewsPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = sp?.filter || 'pending';

  const where = filter === 'pending' ? { isApproved: false } : filter === 'approved' ? { isApproved: true } : {};

  const [rows, pendingCount, approvedCount, dist, avgAgg] = await Promise.all([
    prisma.review.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 60,
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true, slug: true, images: true, ratingAvg: true, ratingCount: true } },
      },
    }),
    prisma.review.count({ where: { isApproved: false } }),
    prisma.review.count({ where: { isApproved: true } }),
    prisma.review.groupBy({ by: ['rating'], where: { isApproved: true }, _count: true }),
    prisma.review.aggregate({ where: { isApproved: true }, _avg: { rating: true } }),
  ]);

  const items = rows.map((r) => ({
    id: r.id, rating: r.rating, title: r.title || '', body: r.body,
    isApproved: r.isApproved, createdAt: r.createdAt.toISOString(),
    userName: r.user?.name || 'کاربر حذف‌شده', userEmail: r.user?.email || '',
    productName: r.product?.name || '—', productSlug: r.product?.slug || '',
    productImage: safeJson(r.product?.images)[0] || '',
    productRating: r.product?.ratingAvg || 0, productReviewCount: r.product?.ratingCount || 0,
  }));

  const dmap = Object.fromEntries(dist.map((d) => [d.rating, d._count]));
  const chartData = [5, 4, 3, 2, 1].map((n) => ({ label: `${n} ستاره`, count: dmap[n] || 0 }));
  const avg = Math.round((avgAgg._avg.rating || 0) * 10) / 10;

  return (
    <>
      <PageHeader title="مدیریت نظرات مشتریان" subtitle="تأیید، رد و پایش بازخوردهای ثبت‌شده روی محصولات" icon="star" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="در انتظار تأیید" value={toFaDigits(groupDigits(pendingCount))} icon="clock" tone={pendingCount ? 'warning' : 'primary'} hint={pendingCount ? 'نیازمند بررسی شما' : 'همه بررسی شده‌اند'} />
        <StatCard label="نظرات تأییدشده" value={toFaDigits(groupDigits(approvedCount))} icon="check" tone="success" />
        <StatCard label="میانگین امتیاز" value={`${toFaDigits(avg)} از ۵`} icon="star" tone="accent" />
        <StatCard label="نظرات مثبت (۴ و ۵)" value={`٪${toFaDigits(approvedCount ? Math.round((((dmap[4] || 0) + (dmap[5] || 0)) / approvedCount) * 100) : 0)}`} icon="heart" tone="success" />
      </div>

      <ChartCard title="توزیع امتیازها" subtitle="فقط نظرات تأییدشده" height={220} className="mb-4">
        <BarsChart data={chartData} keys={['count']} names={{ count: 'تعداد نظر' }} money={false} horizontal />
      </ChartCard>

      <ReviewsManager items={items} filter={filter} pendingCount={pendingCount} approvedCount={approvedCount} />
    </>
  );
}
