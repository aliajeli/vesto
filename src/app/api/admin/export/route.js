import prisma from '@/lib/db';
import { requireAdmin, clientMeta } from '@/lib/auth';
import { handleError, fail } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { resolveRange, salesSeries, breakdowns, profitAndLoss, ledgerSummary, inventoryHealth } from '@/lib/analytics';
import { toToman } from '@/lib/money';

export const dynamic = 'force-dynamic';

const esc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const rows2csv = (rows) => '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
const t = (rial) => toToman(rial);

export async function GET(req) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'sales';
    const range = resolveRange(searchParams.get('range') || '30d', searchParams.get('from'), searchParams.get('to'));

    let rows = [];

    if (type === 'sales') {
      const s = await salesSeries(range);
      rows = [
        ['دوره', 'درآمد (تومان)', 'فروش خالص', 'بهای تمام‌شده', 'سود ناخالص', 'تخفیف', 'مالیات', 'ارسال', 'سفارش موفق', 'کل سفارش', 'لغو‌شده', 'تعداد کالا'],
        ...s.map((r) => [r.label, t(r.revenue), t(r.netSales), t(r.cost), t(r.profit), t(r.discount), t(r.tax), t(r.shipping), r.paidOrders, r.orders, r.cancelled, r.items]),
      ];
    } else if (type === 'accounting') {
      const [pl, ledger] = await Promise.all([profitAndLoss(range), ledgerSummary(range)]);
      rows = [
        ['صورت سود و زیان', 'مبلغ (تومان)'],
        ['فروش ناخالص', t(pl.grossSales)],
        ['تخفیفات', t(pl.discounts)],
        ['فروش خالص', t(pl.netSales)],
        ['بهای تمام‌شده کالای فروش‌رفته', t(pl.cogs)],
        ['سود ناخالص', t(pl.grossProfit)],
        ['حاشیه سود ناخالص (٪)', pl.grossMargin],
        ['درآمد حمل و نقل', t(pl.shippingIncome)],
        ['مالیات وصول‌شده', t(pl.taxCollected)],
        ['هزینه‌های عملیاتی', t(pl.opex)],
        ['سود عملیاتی', t(pl.operatingProfit)],
        ['استرداد', t(pl.refunded)],
        ['سود خالص', t(pl.netProfit)],
        ['حاشیه سود خالص (٪)', pl.netMargin],
        [],
        ['دفتر کل', 'نوع', 'اسناد', 'بدهکار (تومان)', 'بستانکار (تومان)'],
        ...ledger.accounts.map((a) => [a.account, a.type, a.entries, t(a.debit), t(a.credit)]),
        ['جمع کل', '', '', t(ledger.totalDebit), t(ledger.totalCredit)],
      ];
    } else if (type === 'products') {
      const bd = await breakdowns(range);
      rows = [
        ['ردیف', 'محصول', 'تعداد فروش', 'درآمد (تومان)', 'سود (تومان)'],
        ...bd.topProducts.map((p, i) => [i + 1, p.name, p.qty, t(p.revenue), t(p.profit)]),
      ];
    } else if (type === 'orders') {
      const orders = await prisma.order.findMany({
        where: { createdAt: { gte: range.from, lte: range.to } },
        orderBy: { createdAt: 'desc' },
        take: 5000,
        include: {
          items: { select: { quantity: true } },
          address: true,
          user: { select: { name: true, phone: true, email: true } },
          payments: { where: { status: 'SUCCESS' }, select: { gateway: true, refId: true }, take: 1 },
        },
      });
      rows = [
        ['شماره سفارش', 'تاریخ', 'مشتری', 'موبایل', 'استان', 'شهر', 'وضعیت', 'اقلام', 'جمع کل (تومان)', 'تخفیف', 'مالیات', 'ارسال', 'مبلغ نهایی', 'کد تخفیف', 'درگاه', 'کد پیگیری بانک', 'کد رهگیری پست'],
        ...orders.map((o) => [
          o.orderNumber,
          new Date(o.createdAt).toISOString().slice(0, 19).replace('T', ' '),
          o.address?.fullName || o.user?.name || o.guestName || '',
          o.address?.phone || o.user?.phone || o.guestPhone || '',
          o.address?.province || '',
          o.address?.city || '',
          o.status,
          o.items.reduce((s, i) => s + i.quantity, 0),
          t(o.subtotal), t(o.discountTotal), t(o.taxTotal), t(o.shippingTotal), t(o.grandTotal),
          o.couponCode || '', o.payments[0]?.gateway || '', o.payments[0]?.refId || '', o.trackingCode || '',
        ]),
      ];
    } else if (type === 'inventory') {
      const products = await prisma.product.findMany({
        include: { category: { select: { name: true } }, brand: { select: { name: true } }, variants: true },
        orderBy: { name: 'asc' },
      });
      rows = [
        ['SKU', 'محصول', 'دسته', 'برند', 'سایز', 'رنگ', 'موجودی', 'قیمت (تومان)', 'بهای خرید', 'ارزش انبار'],
      ];
      for (const p of products) {
        for (const v of p.variants) {
          rows.push([
            v.sku || p.sku || '', p.name, p.category?.name || '', p.brand?.name || '',
            v.size || '', v.color || '', v.stock,
            t(p.price + (v.priceDiff || 0)), t(p.costPrice || 0), t((p.costPrice || 0) * v.stock),
          ]);
        }
      }
      const inv = await inventoryHealth();
      rows.push([], ['جمع واحدها', inv.totalUnits], ['ارزش انبار (تومان)', t(inv.stockValue)], ['ارزش فروش (تومان)', t(inv.retailValue)]);
    } else if (type === 'customers') {
      const users = await prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        include: { orders: { where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } }, select: { grandTotal: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
      });
      rows = [
        ['نام', 'ایمیل', 'موبایل', 'تاریخ عضویت', 'تعداد خرید', 'مجموع خرید (تومان)', 'میانگین سبد', 'آخرین خرید'],
        ...users.map((u) => {
          const total = u.orders.reduce((s, o) => s + o.grandTotal, 0);
          const last = u.orders.length ? new Date(Math.max(...u.orders.map((o) => +new Date(o.createdAt)))).toISOString().slice(0, 10) : '';
          return [u.name || '', u.email || '', u.phone || '', new Date(u.createdAt).toISOString().slice(0, 10), u.orders.length, t(total), u.orders.length ? t(Math.round(total / u.orders.length)) : 0, last];
        }),
      ];
    } else if (type === 'ledger') {
      const entries = await prisma.ledgerEntry.findMany({
        where: { date: { gte: range.from, lte: range.to } },
        orderBy: { date: 'desc' },
        take: 10000,
      });
      rows = [
        ['تاریخ', 'نوع', 'حساب', 'بدهکار (تومان)', 'بستانکار (تومان)', 'مرجع', 'شرح'],
        ...entries.map((e) => [new Date(e.date).toISOString().slice(0, 19).replace('T', ' '), e.type, e.account, t(e.debit), t(e.credit), e.refType || '', e.description || '']),
      ];
    } else {
      return fail('نوع گزارش نامعتبر است.', 400);
    }

    const meta = await clientMeta();
    await logAudit({
      userId: admin.id, actorName: admin.name || admin.email, action: 'دریافت خروجی CSV',
      entity: 'Report', entityId: type, severity: 'INFO',
      after: JSON.stringify({ type, range: range.preset, rows: rows.length }), ...meta,
    });

    const csv = rows2csv(rows);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="vesto-${type}-${range.preset}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
