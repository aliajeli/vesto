import { requireAdmin } from '@/lib/auth';
import { resolveRange, salesSeries, kpiSummary, breakdowns } from '@/lib/analytics';
import { formatCompact, toFaDigits, groupDigits, formatPrice } from '@/lib/money';
import { StatCard, PageHeader, DataTable, ProgressBar } from '@/components/admin/AdminUI';
import { RangePicker } from '@/components/admin/RangePicker';
import { ChartCard, RevenueChart, BarsChart, DonutChart, SimpleLine, RadarChartView } from '@/components/admin/Charts';
import ExportButton from '@/components/admin/ExportButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'تحلیل فروش' };

export default async function AnalyticsPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const range = resolveRange(sp?.range || '30d');

  const [series, kpi, bd] = await Promise.all([
    salesSeries(range),
    kpiSummary(range),
    breakdowns(range),
  ]);

  const c = kpi.current;
  const p = kpi.previous;

  const gwNames = { zibal: 'زیبال', zarinpal: 'زرین‌پال', payping: 'پی‌پینگ', sandbox: 'شبیه‌ساز' };
  const maxProductRevenue = Math.max(1, ...bd.topProducts.map((x) => x.revenue));

  return (
    <>
      <PageHeader title="تحلیل فروش" subtitle="بررسی عمیق عملکرد فروش در بازه‌های ساعتی، روزانه، ماهانه و سالانه" icon="chart">
        <ExportButton type="sales" range={range.preset} />
        <RangePicker current={range.preset} />
      </PageHeader>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="درآمد" value={formatCompact(c.revenue)} suffix="تومان" delta={kpi.deltas.revenue} icon="wallet" hint={`دوره قبل: ${formatCompact(p.revenue)}`} />
        <StatCard label="سود ناخالص" value={formatCompact(c.grossProfit)} suffix="تومان" delta={kpi.deltas.grossProfit} icon="chart" tone="success" hint={`حاشیه ٪${toFaDigits(kpi.margin)}`} />
        <StatCard label="سفارش موفق" value={toFaDigits(groupDigits(c.paidOrders))} delta={kpi.deltas.paidOrders} icon="box" tone="accent" hint={`نرخ تبدیل ٪${toFaDigits(c.conversion)}`} />
        <StatCard label="میانگین ارزش سبد" value={formatCompact(c.aov)} suffix="تومان" delta={kpi.deltas.aov} icon="cart" tone="warning" />
      </div>

      {/* روند */}
      <ChartCard title="روند درآمد، سود و بهای تمام‌شده" subtitle={label(range.granularity)} height={340} className="mb-4">
        <RevenueChart data={series} keys={['revenue', 'profit', 'cost']} names={{ revenue: 'درآمد', profit: 'سود ناخالص', cost: 'بهای تمام‌شده' }} />
      </ChartCard>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="تعداد سفارش‌ها" subtitle="موفق در برابر لغو‌شده" height={280}>
          <BarsChart
            data={series}
            keys={['paidOrders', 'cancelled']}
            names={{ paidOrders: 'موفق', cancelled: 'لغو‌شده' }}
            money={false}
            stacked
          />
        </ChartCard>

        <ChartCard title="تخفیف، مالیات و ارسال" subtitle="اجزای تشکیل‌دهنده مبلغ نهایی" height={280}>
          <SimpleLine data={series} keys={['discount', 'tax', 'shipping']} names={{ discount: 'تخفیف', tax: 'مالیات', shipping: 'ارسال' }} />
        </ChartCard>
      </div>

      {/* ساعتی و هفتگی */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="فروش ساعتی (۲۴ ساعت)" subtitle="بهترین ساعات برای کمپین تبلیغاتی" height={300}>
          <BarsChart
            data={bd.hourly.map((h) => ({ label: toFaDigits(h.hour), revenue: h.revenue, orders: h.orders }))}
            keys={['revenue']}
            names={{ revenue: 'درآمد' }}
          />
        </ChartCard>

        <ChartCard title="الگوی روزهای هفته" subtitle="مقایسه تعداد سفارش" height={300}>
          <RadarChartView data={bd.weekday.map((w) => ({ name: w.name, value: w.orders }))} />
        </ChartCard>
      </div>

      {/* سهم‌ها */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <ChartCard title="سهم دسته‌بندی" subtitle="بر اساس درآمد" height={280}>
          <DonutChart data={bd.categoryShare.slice(0, 7)} />
        </ChartCard>
        <ChartCard title="محبوب‌ترین سایزها" subtitle="بر اساس تعداد فروش" height={280}>
          <DonutChart data={bd.sizeShare.slice(0, 7)} money={false} />
        </ChartCard>
        <ChartCard title="محبوب‌ترین رنگ‌ها" subtitle="بر اساس تعداد فروش" height={280}>
          <DonutChart data={bd.colorShare.slice(0, 7)} money={false} />
        </ChartCard>
      </div>

      {/* جداول */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4 md:p-5">
          <h3 className="text-sm font-extrabold mb-4">۱۰ محصول برتر</h3>
          <DataTable
            dense
            columns={[
              {
                key: 'name',
                title: 'محصول',
                render: (r, i) => (
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate max-w-[190px]">{toFaDigits(i + 1)}. {r.name}</p>
                    <div className="mt-1.5 w-32"><ProgressBar value={r.revenue} max={maxProductRevenue} showLabel={false} /></div>
                  </div>
                ),
              },
              { key: 'qty', title: 'تعداد', align: 'center', render: (r) => <span className="text-xs tabular">{toFaDigits(r.qty)}</span> },
              { key: 'revenue', title: 'درآمد', align: 'left', render: (r) => <span className="text-xs font-extrabold tabular">{formatCompact(r.revenue)}</span> },
              { key: 'profit', title: 'سود', align: 'left', render: (r) => <span className="text-xs font-bold tabular" style={{ color: 'var(--success)' }}>{formatCompact(r.profit)}</span> },
            ]}
            rows={bd.topProducts}
          />
        </div>

        <div className="space-y-4">
          <div className="card p-4 md:p-5">
            <h3 className="text-sm font-extrabold mb-4">عملکرد درگاه‌های پرداخت</h3>
            <DataTable
              dense
              columns={[
                { key: 'gateway', title: 'درگاه', render: (r) => <span className="text-xs font-bold">{gwNames[r.gateway] || r.gateway}</span> },
                { key: 'success', title: 'موفق', align: 'center', render: (r) => <span className="text-xs tabular" style={{ color: 'var(--success)' }}>{toFaDigits(r.success)}</span> },
                { key: 'failed', title: 'ناموفق', align: 'center', render: (r) => <span className="text-xs tabular" style={{ color: 'var(--danger)' }}>{toFaDigits(r.failed)}</span> },
                {
                  key: 'rate', title: 'نرخ موفقیت', align: 'center',
                  render: (r) => {
                    const total = r.success + r.failed;
                    const rate = total ? Math.round((r.success / total) * 100) : 0;
                    return <span className="text-xs font-extrabold tabular">٪{toFaDigits(rate)}</span>;
                  },
                },
                { key: 'amount', title: 'مبلغ', align: 'left', render: (r) => <span className="text-xs font-extrabold tabular">{formatCompact(r.amount)}</span> },
              ]}
              rows={bd.gateways}
              empty="تراکنشی در این بازه ثبت نشده است."
            />
          </div>

          <div className="card p-4 md:p-5">
            <h3 className="text-sm font-extrabold mb-4">عملکرد کدهای تخفیف</h3>
            <DataTable
              dense
              columns={[
                { key: 'code', title: 'کد', render: (r) => <span className="text-xs font-extrabold tabular" dir="ltr">{r.code}</span> },
                { key: 'uses', title: 'دفعات', align: 'center', render: (r) => <span className="text-xs tabular">{toFaDigits(r.uses)}</span> },
                { key: 'discount', title: 'تخفیف داده‌شده', align: 'left', render: (r) => <span className="text-xs tabular" style={{ color: 'var(--danger)' }}>{formatCompact(r.discount)}</span> },
                { key: 'revenue', title: 'درآمد حاصل', align: 'left', render: (r) => <span className="text-xs font-extrabold tabular">{formatCompact(r.revenue)}</span> },
              ]}
              rows={bd.coupons}
              empty="کد تخفیفی در این بازه استفاده نشده است."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard label="خریداران یکتا" value={toFaDigits(bd.customers.uniqueBuyers)} icon="users" />
            <StatCard label="خرید تکراری" value={toFaDigits(bd.customers.repeat)} icon="refresh" tone="success" />
            <StatCard label="نرخ بازگشت" value={`٪${toFaDigits(bd.customers.repeatRate)}`} icon="chart" tone="accent" />
          </div>
        </div>
      </div>
    </>
  );
}

function label(g) {
  return { hour: 'تفکیک ساعتی', day: 'تفکیک روزانه', month: 'تفکیک ماهانه', year: 'تفکیک سالانه' }[g] || '';
}
