import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { PageHeader, StatCard, DataTable, ProgressBar } from '@/components/admin/AdminUI';
import { RangePicker } from '@/components/admin/RangePicker';
import ExportButton from '@/components/admin/ExportButton';
import CustomerActions from '@/components/admin/CustomerActions';
import { ChartCard, DonutChart, BarsChart } from '@/components/admin/Charts';
import { formatPrice, formatCompact, toFaDigits, groupDigits } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'مشتریان' };

const PAID = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
const PAGE_SIZE = 20;

function faDate(d) {
  try {
    return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(d));
  } catch { return '—'; }
}

export default async function CustomersPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp?.q || '').trim();
  const page = Math.max(1, Number(sp?.page || 1));
  const sort = sp?.sort || 'spent';

  const where = {
    role: 'CUSTOMER',
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] } : {}),
  };

  const [users, total, newsletterCount, guestOrders, provinceRows] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        orders: { select: { grandTotal: true, costTotal: true, discountTotal: true, subtotal: true, status: true, createdAt: true } },
        _count: { select: { reviews: true, addresses: true, wishlist: true } },
        addresses: { where: { isDefault: true }, take: 1, select: { province: true, city: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.newsletter.count(),
    prisma.order.count({ where: { userId: null } }),
    prisma.address.groupBy({ by: ['province'], _count: true, orderBy: { _count: { province: 'desc' } }, take: 8 }),
  ]);

  const enriched = users.map((u) => {
    const paid = u.orders.filter((o) => PAID.includes(o.status));
    const spent = paid.reduce((s, o) => s + o.grandTotal, 0);
    const profit = paid.reduce((s, o) => s + (o.subtotal - o.discountTotal - o.costTotal), 0);
    const last = paid.length ? new Date(Math.max(...paid.map((o) => +new Date(o.createdAt)))) : null;
    const daysSince = last ? Math.max(0, Math.floor((Date.now() - +last) / 86400000)) : null;
    const tier = spent >= 500_000_000 ? 'platinum' : spent >= 200_000_000 ? 'gold' : spent >= 50_000_000 ? 'silver' : paid.length ? 'bronze' : 'new';
    return {
      id: u.id, name: u.name, email: u.email || '', phone: u.phone || '',
      isActive: u.isActive, createdAt: u.createdAt.toISOString(), lastLoginAt: u.lastLoginAt?.toISOString() || null,
      orderCount: paid.length, totalOrders: u.orders.length, spent, profit,
      aov: paid.length ? Math.round(spent / paid.length) : 0,
      lastOrder: last ? last.toISOString() : null, daysSince, tier,
      reviews: u._count.reviews, addresses: u._count.addresses, wishlist: u._count.wishlist,
      province: u.addresses[0]?.province || '', city: u.addresses[0]?.city || '',
      lockedOut: false,
    };
  });

  const sorted = [...enriched].sort((a, b) => {
    if (sort === 'orders') return b.orderCount - a.orderCount;
    if (sort === 'recent') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === 'name') return a.name.localeCompare(b.name, 'fa');
    return b.spent - a.spent;
  });

  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const maxSpent = Math.max(1, ...enriched.map((c) => c.spent));

  const tiers = [
    { key: 'platinum', name: 'پلاتینیوم (بالای ۵۰ م)', color: 0 },
    { key: 'gold', name: 'طلایی (۲۰ تا ۵۰ م)', color: 1 },
    { key: 'silver', name: 'نقره‌ای (۵ تا ۲۰ م)', color: 2 },
    { key: 'bronze', name: 'برنزی (زیر ۵ م)', color: 3 },
    { key: 'new', name: 'بدون خرید', color: 4 },
  ].map((t) => ({ name: t.name, value: enriched.filter((c) => c.tier === t.key).length }));

  const buyers = enriched.filter((c) => c.orderCount > 0);
  const repeat = enriched.filter((c) => c.orderCount > 1);
  const totalLtv = enriched.reduce((s, c) => s + c.spent, 0);

  const TIER_STYLE = {
    platinum: { label: 'پلاتینیوم', color: 'var(--accent)' },
    gold: { label: 'طلایی', color: 'var(--primary)' },
    silver: { label: 'نقره‌ای', color: 'var(--text-muted)' },
    bronze: { label: 'برنزی', color: 'var(--warning)' },
    new: { label: 'بدون خرید', color: 'var(--text-muted)' },
  };

  return (
    <>
      <PageHeader title="مدیریت مشتریان" subtitle={`${toFaDigits(groupDigits(total))} مشتری ثبت‌نام‌شده و ${toFaDigits(groupDigits(guestOrders))} سفارش مهمان`} icon="users">
        <ExportButton type="customers" range="all" label="خروجی مشتریان" />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="کل مشتریان" value={toFaDigits(groupDigits(total))} icon="users" hint={`${toFaDigits(buyers.length)} نفر خرید کرده‌اند`} />
        <StatCard label="ارزش طول عمر کل" value={formatCompact(totalLtv)} suffix="تومان" icon="wallet" tone="success" hint={buyers.length ? `میانگین: ${formatCompact(Math.round(totalLtv / buyers.length))}` : undefined} />
        <StatCard label="مشتریان وفادار" value={toFaDigits(repeat.length)} icon="heart" tone="accent" hint={buyers.length ? `نرخ بازگشت ٪${toFaDigits(Math.round((repeat.length / buyers.length) * 100))}` : undefined} />
        <StatCard label="عضو خبرنامه" value={toFaDigits(groupDigits(newsletterCount))} icon="mail" tone="warning" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <ChartCard title="سطح‌بندی مشتریان" subtitle="بر اساس مجموع خرید" height={260}>
          <DonutChart data={tiers} money={false} />
        </ChartCard>
        <ChartCard title="پراکندگی جغرافیایی" subtitle="۸ استان برتر بر اساس تعداد آدرس" height={260} className="lg:col-span-2">
          <BarsChart
            data={provinceRows.map((p) => ({ label: p.province, count: p._count }))}
            keys={['count']} names={{ count: 'تعداد مشتری' }} money={false} horizontal
          />
        </ChartCard>
      </div>

      <div className="card p-4 md:p-5">
        <CustomerActions q={q} sort={sort} />

        <DataTable
          columns={[
            {
              key: 'name', title: 'مشتری',
              render: (c) => (
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-full grid place-items-center shrink-0 text-[11px] font-extrabold" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                    {c.name.slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate max-w-[160px]">{c.name}</p>
                    <p className="text-[10px] text-muted tabular truncate max-w-[160px]" dir="ltr">{c.email || c.phone}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'tier', title: 'سطح', align: 'center',
              render: (c) => {
                const t = TIER_STYLE[c.tier];
                return <span className="badge" style={{ background: `color-mix(in srgb, ${t.color} 15%, transparent)`, color: t.color }}>{t.label}</span>;
              },
            },
            { key: 'location', title: 'موقعیت', render: (c) => <span className="text-[11px] text-muted">{c.province ? `${c.province}${c.city ? ` — ${c.city}` : ''}` : '—'}</span> },
            { key: 'orderCount', title: 'سفارش', align: 'center', render: (c) => <span className="text-xs tabular font-bold">{toFaDigits(c.orderCount)}</span> },
            {
              key: 'spent', title: 'مجموع خرید', align: 'left',
              render: (c) => (
                <div className="w-32">
                  <p className="text-xs font-extrabold tabular text-left mb-1">{formatPrice(c.spent)}</p>
                  <ProgressBar value={c.spent} max={maxSpent} showLabel={false} />
                </div>
              ),
            },
            { key: 'aov', title: 'میانگین سبد', align: 'left', render: (c) => <span className="text-xs tabular text-muted">{c.aov ? formatCompact(c.aov) : '—'}</span> },
            { key: 'profit', title: 'سود', align: 'left', render: (c) => <span className="text-xs tabular font-bold" style={{ color: 'var(--success)' }}>{c.profit ? formatCompact(c.profit) : '—'}</span> },
            {
              key: 'lastOrder', title: 'آخرین خرید', align: 'center',
              render: (c) => (
                c.lastOrder ? (
                  <div>
                    <p className="text-[11px]">{faDate(c.lastOrder)}</p>
                    <p className="text-[9px] text-muted">{toFaDigits(c.daysSince)} روز پیش</p>
                  </div>
                ) : <span className="text-[11px] text-muted">هرگز</span>
              ),
            },
            { key: 'createdAt', title: 'عضویت', align: 'center', render: (c) => <span className="text-[11px] text-muted">{faDate(c.createdAt)}</span> },
            {
              key: 'engagement', title: 'تعامل', align: 'center',
              render: (c) => (
                <div className="flex items-center justify-center gap-2 text-[10px] text-muted tabular">
                  <span title="نظر">★{toFaDigits(c.reviews)}</span>
                  <span title="علاقه‌مندی">♡{toFaDigits(c.wishlist)}</span>
                </div>
              ),
            },
          ]}
          rows={paged}
          empty="مشتری‌ای با این جستجو یافت نشد."
        />

        {sorted.length > PAGE_SIZE && (
          <p className="text-center text-[11px] text-muted mt-4 tabular">
            نمایش {toFaDigits((page - 1) * PAGE_SIZE + 1)} تا {toFaDigits(Math.min(page * PAGE_SIZE, sorted.length))} از {toFaDigits(groupDigits(sorted.length))} مشتری
          </p>
        )}
      </div>
    </>
  );
}
