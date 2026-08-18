import Link from 'next/link';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { resolveRange, salesSeries, kpiSummary, breakdowns, inventoryHealth } from '@/lib/analytics';
import { formatPrice, formatCompact, toFaDigits, groupDigits } from '@/lib/money';
import { StatCard, PageHeader, DataTable, StatusBadge, ProgressBar } from '@/components/admin/AdminUI';
import { RangePicker } from '@/components/admin/RangePicker';
import { ChartCard, RevenueChart, BarsChart, DonutChart, ComboChart } from '@/components/admin/Charts';
import { Icons } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const range = resolveRange(sp?.range || '30d');
  const settings = await getSettings();

  const [series, kpi, bd, inv, recentOrders, pendingReviews] = await Promise.all([
    salesSeries(range),
    kpiSummary(range),
    breakdowns(range),
    inventoryHealth(settings.lowStockThreshold),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { items: { select: { id: true } }, user: { select: { name: true } } },
    }),
    prisma.review.count({ where: { isApproved: false } }),
  ]);

  const c = kpi.current;

  const statusChart = bd.statuses.map((s) => ({
    name: { PENDING: 'در انتظار', PAID: 'پرداخت‌شده', PROCESSING: 'آماده‌سازی', SHIPPED: 'ارسال‌شده', DELIVERED: 'تحویل‌شده', CANCELLED: 'لغو‌شده', REFUNDED: 'مسترد' }[s.status] || s.status,
    value: s.count,
  }));

  const alerts = [
    inv.outCount > 0 && { tone: 'danger', icon: 'alert', text: `${toFaDigits(inv.outCount)} محصول ناموجود شده است`, href: '/admin/panel/products?stock=out' },
    inv.lowCount > 0 && { tone: 'warning', icon: 'box', text: `${toFaDigits(inv.lowCount)} محصول موجودی کمی دارد`, href: '/admin/panel/products?stock=low' },
    pendingReviews > 0 && { tone: 'accent', icon: 'star', text: `${toFaDigits(pendingReviews)} نظر در انتظار تأیید`, href: '/admin/panel/reviews' },
    settings.activeGateway === 'sandbox' && { tone: 'warning', icon: 'wallet', text: 'درگاه پرداخت در حالت آزمایشی است', href: '/admin/panel/settings' },
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="داشبورد مدیریت" subtitle={`نمای کلی عملکرد ${settings.storeNameFa || 'فروشگاه'}`} icon="grid">
        <RangePicker current={range.preset} />
      </PageHeader>

      {/* هشدارها */}
      {alerts.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
          {alerts.map((a, i) => {
            const I = Icons[a.icon];
            const col = { danger: 'var(--danger)', warning: 'var(--warning)', accent: 'var(--accent)' }[a.tone];
            return (
              <Link
                key={i}
                href={a.href}
                className="flex items-center gap-2.5 p-3 rounded-theme text-xs font-bold transition-transform hover:-translate-y-0.5"
                style={{ background: `color-mix(in srgb, ${col} 12%, transparent)`, color: col, border: `1px solid color-mix(in srgb, ${col} 30%, transparent)` }}
              >
                <I size={17} className="shrink-0" />
                <span className="flex-1 leading-5">{a.text}</span>
                <Icons.chevronLeft size={14} />
              </Link>
            );
          })}
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <StatCard label="درآمد کل" value={formatCompact(c.revenue)} suffix="تومان" delta={kpi.deltas.revenue} icon="wallet" tone="primary" />
        <StatCard label="سود ناخالص" value={formatCompact(c.grossProfit)} suffix="تومان" delta={kpi.deltas.grossProfit} icon="chart" tone="success" hint={`حاشیه سود ٪${toFaDigits(kpi.margin)}`} />
        <StatCard label="سفارش موفق" value={toFaDigits(groupDigits(c.paidOrders))} delta={kpi.deltas.paidOrders} icon="box" tone="accent" hint={`از ${toFaDigits(c.totalOrders)} سفارش`} />
        <StatCard label="میانگین سبد" value={formatCompact(c.aov)} suffix="تومان" delta={kpi.deltas.aov} icon="cart" tone="warning" />
        <StatCard label="کالای فروخته‌شده" value={toFaDigits(groupDigits(c.itemsSold))} suffix="عدد" delta={kpi.deltas.itemsSold} icon="package" tone="primary" />
        <StatCard label="مشتری جدید" value={toFaDigits(groupDigits(c.newCustomers))} delta={kpi.deltas.newCustomers} icon="users" tone="success" hint={`نرخ تبدیل ٪${toFaDigits(c.conversion)}`} />
      </div>

      {/* نمودار اصلی */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <ChartCard
          title="روند درآمد و سود"
          subtitle={granularityLabel(range.granularity)}
          className="lg:col-span-2"
          height={320}
        >
          <RevenueChart
            data={series}
            keys={['revenue', 'profit', 'cost']}
            names={{ revenue: 'درآمد', profit: 'سود ناخالص', cost: 'بهای تمام‌شده' }}
          />
        </ChartCard>

        <ChartCard title="وضعیت سفارش‌ها" subtitle="توزیع بر اساس وضعیت" height={320}>
          <DonutChart data={statusChart} money={false} />
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <ChartCard title="تعداد سفارش و درآمد" subtitle="مقایسه حجم و ارزش" className="lg:col-span-2" height={280}>
          <ComboChart data={series} barKey="revenue" lineKey="paidOrders" barName="درآمد" lineName="تعداد سفارش" />
        </ChartCard>

        <ChartCard title="سهم دسته‌بندی‌ها" subtitle="بر اساس درآمد" height={280}>
          <DonutChart data={bd.categoryShare.slice(0, 6)} />
        </ChartCard>
      </div>

      {/* الگوی ساعتی + پرفروش‌ها */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="الگوی خرید در ساعات شبانه‌روز" subtitle="مجموع سفارش‌ها در بازه انتخابی" height={260}>
          <BarsChart
            data={bd.hourly.map((h) => ({ label: toFaDigits(h.hour), orders: h.orders }))}
            keys={['orders']}
            names={{ orders: 'سفارش' }}
            money={false}
          />
        </ChartCard>

        <ChartCard title="فروش بر اساس روز هفته" subtitle="بهترین روزهای فروش" height={260}>
          <BarsChart
            data={bd.weekday.map((w) => ({ label: w.name, revenue: w.revenue }))}
            keys={['revenue']}
            names={{ revenue: 'درآمد' }}
          />
        </ChartCard>
      </div>

      {/* جدول‌ها */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold">پرفروش‌ترین محصولات</h3>
            <Link href="/admin/panel/products" className="btn btn-ghost btn-sm">همه محصولات</Link>
          </div>
          <DataTable
            dense
            columns={[
              {
                key: 'name',
                title: 'محصول',
                render: (r, i) => (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-[10px] text-muted tabular shrink-0">{toFaDigits(i + 1)}</span>
                    <span className="w-8 h-10 rounded-[6px] overflow-hidden shrink-0" style={{ background: 'var(--surface-2)' }}>
                      {r.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={r.image} alt="" className="w-full h-full object-cover" />}
                    </span>
                    <span className="text-xs font-bold truncate max-w-[160px]">{r.name}</span>
                  </div>
                ),
              },
              { key: 'qty', title: 'تعداد', align: 'center', render: (r) => <span className="text-xs tabular">{toFaDigits(r.qty)}</span> },
              { key: 'revenue', title: 'درآمد', align: 'left', render: (r) => <span className="text-xs font-extrabold tabular">{formatCompact(r.revenue)}</span> },
              { key: 'profit', title: 'سود', align: 'left', render: (r) => <span className="text-xs font-bold tabular" style={{ color: 'var(--success)' }}>{formatCompact(r.profit)}</span> },
            ]}
            rows={bd.topProducts.slice(0, 8)}
          />
        </div>

        <div className="card p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold">آخرین سفارش‌ها</h3>
            <Link href="/admin/panel/orders" className="btn btn-ghost btn-sm">همه سفارش‌ها</Link>
          </div>
          <DataTable
            dense
            columns={[
              {
                key: 'orderNumber',
                title: 'شماره',
                render: (r) => (
                  <Link href={`/admin/panel/orders?q=${r.orderNumber}`} className="text-[11px] font-bold tabular hover:text-[var(--primary)]" dir="ltr">
                    {r.orderNumber.replace('VS-', '')}
                  </Link>
                ),
              },
              { key: 'user', title: 'مشتری', render: (r) => <span className="text-xs truncate block max-w-[110px]">{r.user?.name || r.guestName || 'مهمان'}</span> },
              { key: 'status', title: 'وضعیت', align: 'center', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'grandTotal', title: 'مبلغ', align: 'left', render: (r) => <span className="text-xs font-extrabold tabular">{formatCompact(r.grandTotal)}</span> },
            ]}
            rows={recentOrders}
          />
        </div>
      </div>

      {/* انبار */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <StatCard label="ارزش انبار (خرید)" value={formatCompact(inv.stockValue)} suffix="تومان" icon="box" tone="accent" />
        <StatCard label="ارزش انبار (فروش)" value={formatCompact(inv.retailValue)} suffix="تومان" icon="tag" tone="primary" />
        <StatCard label="سود بالقوه انبار" value={formatCompact(inv.potentialProfit)} suffix="تومان" icon="chart" tone="success" />
        <StatCard label="تعداد کل موجودی" value={toFaDigits(groupDigits(inv.totalUnits))} suffix="عدد" icon="package" tone="warning" hint={`${toFaDigits(inv.productCount)} محصول / ${toFaDigits(inv.variantCount)} تنوع`} />
      </div>
    </>
  );
}

function granularityLabel(g) {
  return { hour: 'تفکیک ساعتی', day: 'تفکیک روزانه', month: 'تفکیک ماهانه', year: 'تفکیک سالانه' }[g] || '';
}
