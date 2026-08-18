import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { resolveRange, profitAndLoss, ledgerSummary, salesSeries, inventoryHealth } from '@/lib/analytics';
import { getSettings } from '@/lib/settings';
import { formatPrice, formatCompact, toFaDigits, groupDigits } from '@/lib/money';
import { StatCard, PageHeader, DataTable } from '@/components/admin/AdminUI';
import { RangePicker } from '@/components/admin/RangePicker';
import { ChartCard, BarsChart, DonutChart, RevenueChart } from '@/components/admin/Charts';
import ExportButton from '@/components/admin/ExportButton';
import ExpenseManager from '@/components/admin/ExpenseManager';
import { Icons } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'حسابداری' };

export default async function AccountingPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const range = resolveRange(sp?.range || '12m');
  const settings = await getSettings();

  const [pl, ledger, series, inv, expenses] = await Promise.all([
    profitAndLoss(range),
    ledgerSummary(range),
    salesSeries(range),
    inventoryHealth(settings.lowStockThreshold),
    prisma.expense.findMany({ where: { date: { gte: range.from, lte: range.to } }, orderBy: { date: 'desc' }, take: 40 }),
  ]);

  // صورت سود و زیان
  const plRows = [
    { label: 'فروش ناخالص', value: pl.grossSales, kind: 'plus', bold: false },
    { label: 'کسر: تخفیفات فروش', value: -pl.discounts, kind: 'minus' },
    { label: 'فروش خالص', value: pl.netSales, kind: 'sum', bold: true },
    { label: 'کسر: بهای تمام‌شده کالای فروش‌رفته', value: -pl.cogs, kind: 'minus' },
    { label: 'سود ناخالص', value: pl.grossProfit, kind: 'sum', bold: true, tone: 'success' },
    { label: 'به‌علاوه: درآمد حمل و نقل', value: pl.shippingIncome, kind: 'plus' },
    { label: 'کسر: هزینه‌های عملیاتی', value: -pl.opex, kind: 'minus' },
    { label: 'سود عملیاتی', value: pl.operatingProfit, kind: 'sum', bold: true },
    { label: 'کسر: مرجوعی و استرداد', value: -pl.refunded, kind: 'minus' },
    { label: 'سود خالص', value: pl.netProfit, kind: 'total', bold: true, tone: pl.netProfit >= 0 ? 'success' : 'danger' },
  ];

  const waterfall = [
    { label: 'فروش خالص', value: pl.netSales },
    { label: 'بهای تمام‌شده', value: pl.cogs },
    { label: 'هزینه عملیاتی', value: pl.opex },
    { label: 'سود خالص', value: Math.max(0, pl.netProfit) },
  ];

  const TYPE_NAMES = {
    REVENUE: 'درآمد', COGS: 'بهای تمام‌شده', DISCOUNT: 'تخفیف',
    SHIPPING: 'حمل و نقل', TAX: 'مالیات', REFUND: 'استرداد', EXPENSE: 'هزینه',
  };

  return (
    <>
      <PageHeader title="سیستم حسابداری" subtitle="صورت سود و زیان، دفتر کل، هزینه‌ها و ارزش‌گذاری انبار" icon="wallet">
        <ExportButton type="accounting" range={range.preset} />
        <RangePicker current={range.preset} />
      </PageHeader>

      {/* KPI مالی */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="فروش خالص" value={formatCompact(pl.netSales)} suffix="تومان" icon="chart" />
        <StatCard label="سود ناخالص" value={formatCompact(pl.grossProfit)} suffix="تومان" icon="wallet" tone="success" hint={`حاشیه ٪${toFaDigits(pl.grossMargin)}`} />
        <StatCard label="هزینه‌های عملیاتی" value={formatCompact(pl.opex)} suffix="تومان" icon="alert" tone="danger" />
        <StatCard label="سود خالص" value={formatCompact(pl.netProfit)} suffix="تومان" icon="chart" tone={pl.netProfit >= 0 ? 'success' : 'danger'} hint={`حاشیه ٪${toFaDigits(pl.netMargin)}`} />
        <StatCard label="مالیات وصول‌شده" value={formatCompact(pl.taxCollected)} suffix="تومان" icon="book" tone="warning" hint="بدهی به سازمان امور مالیاتی" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* صورت سود و زیان */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <Icons.book size={17} style={{ color: 'var(--primary)' }} /> صورت سود و زیان
            </h3>
            <span className="text-[10px] text-muted">{toFaDigits(pl.ordersCount)} سفارش</span>
          </div>
          <div className="space-y-0.5">
            {plRows.map((r, i) => (
              <div
                key={i}
                className={`flex items-center justify-between gap-3 py-2.5 px-3 rounded-theme text-sm ${r.kind === 'total' ? 'mt-2' : ''}`}
                style={{
                  background: r.kind === 'total' ? 'var(--primary-soft)' : r.kind === 'sum' ? 'var(--surface-2)' : 'transparent',
                  borderTop: r.kind === 'sum' || r.kind === 'total' ? '1px solid var(--border)' : 'none',
                }}
              >
                <span className={r.bold ? 'font-extrabold' : 'text-muted'} style={{ paddingInlineStart: r.kind === 'minus' || r.kind === 'plus' ? '0.75rem' : 0 }}>
                  {r.label}
                </span>
                <span
                  className={`tabular ${r.bold ? 'font-extrabold' : 'font-bold'}`}
                  style={{
                    color: r.tone === 'success' ? 'var(--success)' : r.tone === 'danger' ? 'var(--danger)' : r.value < 0 ? 'var(--danger)' : undefined,
                  }}
                >
                  {formatPrice(Math.abs(r.value))}
                  {r.value < 0 ? ' −' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* نمودار ترکیب سود */}
        <div className="space-y-4">
          <ChartCard title="ترکیب سود و هزینه" subtitle="از فروش خالص تا سود خالص" height={240}>
            <BarsChart data={waterfall} keys={['value']} names={{ value: 'مبلغ' }} horizontal />
          </ChartCard>

          <ChartCard title="تفکیک هزینه‌های عملیاتی" subtitle={`مجموع ${formatPrice(pl.opex)}`} height={240}>
            <DonutChart data={pl.expenses.map((e) => ({ name: e.category, value: e.amount }))} />
          </ChartCard>
        </div>
      </div>

      {/* روند سود */}
      <ChartCard title="روند سود در طول زمان" subtitle="درآمد در برابر بهای تمام‌شده و سود" height={300} className="mb-4">
        <RevenueChart data={series} keys={['revenue', 'cost', 'profit']} names={{ revenue: 'درآمد', cost: 'بهای تمام‌شده', profit: 'سود ناخالص' }} />
      </ChartCard>

      {/* دفتر کل */}
      <div className="card p-4 md:p-5 mb-4">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className="text-sm font-extrabold flex items-center gap-2">
            <Icons.layers size={17} style={{ color: 'var(--primary)' }} /> دفتر کل (سیستم دوطرفه)
          </h3>
          <span
            className="badge"
            style={{
              background: ledger.balanced ? 'color-mix(in srgb, var(--success) 14%, transparent)' : 'color-mix(in srgb, var(--danger) 14%, transparent)',
              color: ledger.balanced ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {ledger.balanced ? '✓ تراز است' : `اختلاف: ${formatPrice(Math.abs(ledger.difference))}`}
          </span>
        </div>

        <DataTable
          dense
          columns={[
            { key: 'account', title: 'حساب', render: (r) => <span className="text-xs font-bold">{r.account}</span> },
            { key: 'type', title: 'نوع', align: 'center', render: (r) => <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>{TYPE_NAMES[r.type] || r.type}</span> },
            { key: 'entries', title: 'اسناد', align: 'center', render: (r) => <span className="text-xs tabular text-muted">{toFaDigits(groupDigits(r.entries))}</span> },
            { key: 'debit', title: 'بدهکار', align: 'left', render: (r) => <span className="text-xs tabular font-bold">{r.debit ? formatPrice(r.debit) : '—'}</span> },
            { key: 'credit', title: 'بستانکار', align: 'left', render: (r) => <span className="text-xs tabular font-bold">{r.credit ? formatPrice(r.credit) : '—'}</span> },
          ]}
          rows={ledger.accounts}
          empty="سند حسابداری در این بازه ثبت نشده است."
        />

        <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-line text-sm">
          <span className="font-extrabold">جمع کل</span>
          <div className="flex gap-6">
            <span className="tabular">بدهکار: <b>{formatPrice(ledger.totalDebit)}</b></span>
            <span className="tabular">بستانکار: <b>{formatPrice(ledger.totalCredit)}</b></span>
          </div>
        </div>
      </div>

      {/* ارزش انبار */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="ارزش انبار به بهای خرید" value={formatCompact(inv.stockValue)} suffix="تومان" icon="box" />
        <StatCard label="ارزش انبار به بهای فروش" value={formatCompact(inv.retailValue)} suffix="تومان" icon="tag" tone="accent" />
        <StatCard label="سود بالقوه انبار" value={formatCompact(inv.potentialProfit)} suffix="تومان" icon="chart" tone="success" />
        <StatCard label="وجه نقد دریافتی" value={formatCompact(pl.cashCollected)} suffix="تومان" icon="wallet" tone="primary" />
      </div>

      {/* مدیریت هزینه‌ها */}
      <ExpenseManager initialExpenses={expenses.map((e) => ({
        id: e.id, title: e.title, category: e.category, amount: e.amount, date: e.date.toISOString(), note: e.note,
      }))} />
    </>
  );
}
