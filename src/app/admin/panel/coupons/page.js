import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { PageHeader, StatCard } from '@/components/admin/AdminUI';
import CouponsManager from '@/components/admin/CouponsManager';
import { formatCompact, toFaDigits, groupDigits } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'کدهای تخفیف' };

export default async function CouponsPage() {
  await requireAdmin();

  const now = new Date();
  const [coupons, usageRows] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.order.groupBy({
      by: ['couponCode'],
      where: { couponCode: { not: null }, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
      _sum: { discountTotal: true, grandTotal: true },
      _count: true,
    }),
  ]);

  const usage = Object.fromEntries(usageRows.map((r) => [r.couponCode, {
    orders: r._count, discount: r._sum.discountTotal || 0, revenue: r._sum.grandTotal || 0,
  }]));

  const items = coupons.map((c) => {
    const u = usage[c.code] || { orders: 0, discount: 0, revenue: 0 };
    const expired = c.endsAt && c.endsAt < now;
    const notStarted = c.startsAt && c.startsAt > now;
    const exhausted = c.usageLimit != null && c.usedCount >= c.usageLimit;
    return {
      id: c.id, code: c.code, type: c.type, value: c.value,
      minSubtotal: c.minSubtotal, maxDiscount: c.maxDiscount,
      usageLimit: c.usageLimit, usedCount: c.usedCount, perUserLimit: c.perUserLimit,
      startsAt: c.startsAt ? c.startsAt.toISOString() : null,
      endsAt: c.endsAt ? c.endsAt.toISOString() : null,
      isActive: c.isActive, description: c.description || '',
      createdAt: c.createdAt.toISOString(),
      state: !c.isActive ? 'disabled' : expired ? 'expired' : notStarted ? 'scheduled' : exhausted ? 'exhausted' : 'active',
      orders: u.orders, discountGiven: u.discount, revenueGenerated: u.revenue,
    };
  });

  const totalDiscount = items.reduce((s, c) => s + c.discountGiven, 0);
  const totalRevenue = items.reduce((s, c) => s + c.revenueGenerated, 0);
  const activeCount = items.filter((c) => c.state === 'active').length;

  return (
    <>
      <PageHeader title="سیستم کد تخفیف" subtitle="ساخت، زمان‌بندی و رصد عملکرد کمپین‌های تخفیف" icon="ticket" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="کدهای فعال" value={toFaDigits(activeCount)} suffix={`از ${toFaDigits(items.length)}`} icon="ticket" />
        <StatCard label="سفارش با کد تخفیف" value={toFaDigits(groupDigits(items.reduce((s, c) => s + c.orders, 0)))} icon="box" tone="accent" />
        <StatCard label="مجموع تخفیف داده‌شده" value={formatCompact(totalDiscount)} suffix="تومان" icon="tag" tone="danger" />
        <StatCard label="درآمد حاصل از کمپین‌ها" value={formatCompact(totalRevenue)} suffix="تومان" icon="wallet" tone="success" hint={totalDiscount ? `بازگشت سرمایه: ${toFaDigits(Math.round(totalRevenue / totalDiscount))} برابر` : undefined} />
      </div>

      <CouponsManager items={items} />
    </>
  );
}
