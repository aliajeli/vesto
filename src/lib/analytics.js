import 'server-only';
import prisma from './db';

const PAID_STATES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
const DAY = 864e5;

/* ------------------------------------------------------------ تاریخ فارسی */

const faDate = (d, opts) => new Intl.DateTimeFormat('fa-IR', opts).format(d);

export function bucketLabel(date, granularity) {
  const d = new Date(date);
  switch (granularity) {
    case 'hour':
      return faDate(d, { hour: '2-digit', hour12: false }) + ':۰۰';
    case 'day':
      return faDate(d, { month: 'short', day: 'numeric' });
    case 'month':
      return faDate(d, { year: 'numeric', month: 'long' });
    case 'year':
      return faDate(d, { year: 'numeric' });
    default:
      return faDate(d, { month: 'short', day: 'numeric' });
  }
}

/** شروع بازه بر اساس گرانولاریتی */
function truncate(date, g) {
  const d = new Date(date);
  if (g === 'hour') d.setMinutes(0, 0, 0);
  else if (g === 'day') d.setHours(0, 0, 0, 0);
  else if (g === 'month') { d.setHours(0, 0, 0, 0); d.setDate(1); }
  else if (g === 'year') { d.setHours(0, 0, 0, 0); d.setMonth(0, 1); }
  return d;
}

function step(d, g, n = 1) {
  const x = new Date(d);
  if (g === 'hour') x.setHours(x.getHours() + n);
  else if (g === 'day') x.setDate(x.getDate() + n);
  else if (g === 'month') x.setMonth(x.getMonth() + n);
  else if (g === 'year') x.setFullYear(x.getFullYear() + n);
  return x;
}

/** بازه‌های زمانی از پیش تعریف‌شده */
export function resolveRange(preset, customFrom, customTo) {
  const now = new Date();
  let from, to = now, granularity;

  switch (preset) {
    case 'today':
      from = truncate(now, 'day');
      granularity = 'hour';
      break;
    case 'yesterday':
      to = truncate(now, 'day');
      from = new Date(to.getTime() - DAY);
      granularity = 'hour';
      break;
    case '7d':
      from = new Date(truncate(now, 'day').getTime() - 6 * DAY);
      granularity = 'day';
      break;
    case '30d':
      from = new Date(truncate(now, 'day').getTime() - 29 * DAY);
      granularity = 'day';
      break;
    case '90d':
      from = new Date(truncate(now, 'day').getTime() - 89 * DAY);
      granularity = 'day';
      break;
    case '12m':
      from = truncate(step(now, 'month', -11), 'month');
      granularity = 'month';
      break;
    case 'all':
      from = new Date(2000, 0, 1);
      granularity = 'year';
      break;
    case 'custom':
      from = customFrom ? new Date(customFrom) : new Date(now.getTime() - 29 * DAY);
      to = customTo ? new Date(customTo) : now;
      {
        const days = (to - from) / DAY;
        granularity = days <= 2 ? 'hour' : days <= 92 ? 'day' : days <= 800 ? 'month' : 'year';
      }
      break;
    default:
      from = new Date(truncate(now, 'day').getTime() - 29 * DAY);
      granularity = 'day';
  }
  return { from, to, granularity, preset: preset || '30d' };
}

/* ------------------------------------------------------ سری زمانی فروش */

export async function salesSeries({ from, to, granularity }) {
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: {
      createdAt: true,
      status: true,
      grandTotal: true,
      subtotal: true,
      discountTotal: true,
      taxTotal: true,
      shippingTotal: true,
      costTotal: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // ساخت سطل‌های خالی
  const buckets = new Map();
  let cursor = truncate(from, granularity);
  const end = truncate(to, granularity);
  let guard = 0;
  while (cursor <= end && guard++ < 5000) {
    buckets.set(cursor.getTime(), {
      t: cursor.getTime(),
      label: bucketLabel(cursor, granularity),
      revenue: 0,
      netSales: 0,
      profit: 0,
      cost: 0,
      discount: 0,
      tax: 0,
      shipping: 0,
      orders: 0,
      paidOrders: 0,
      cancelled: 0,
      items: 0,
    });
    cursor = step(cursor, granularity);
  }

  for (const o of orders) {
    const k = truncate(o.createdAt, granularity).getTime();
    const b = buckets.get(k);
    if (!b) continue;
    b.orders++;
    if (o.status === 'CANCELLED' || o.status === 'REFUNDED') { b.cancelled++; continue; }
    if (!PAID_STATES.includes(o.status)) continue;
    b.paidOrders++;
    b.revenue += o.grandTotal;
    b.netSales += o.subtotal - o.discountTotal;
    b.cost += o.costTotal;
    b.discount += o.discountTotal;
    b.tax += o.taxTotal;
    b.shipping += o.shippingTotal;
    b.profit += o.subtotal - o.discountTotal - o.costTotal;
  }

  return [...buckets.values()].sort((a, b) => a.t - b.t);
}

/* ------------------------------------------------------------- خلاصه KPI */

export async function kpiSummary({ from, to }) {
  const span = to - from;
  const prevFrom = new Date(from.getTime() - span);
  const prevTo = new Date(from.getTime());

  const agg = async (start, end) => {
    const [paid, all, itemsAgg, customers] = await Promise.all([
      prisma.order.aggregate({
        where: { createdAt: { gte: start, lte: end }, status: { in: PAID_STATES } },
        _sum: { grandTotal: true, subtotal: true, discountTotal: true, taxTotal: true, shippingTotal: true, costTotal: true },
        _count: true,
        _avg: { grandTotal: true },
      }),
      prisma.order.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.orderItem.aggregate({
        where: { order: { createdAt: { gte: start, lte: end }, status: { in: PAID_STATES } } },
        _sum: { quantity: true },
      }),
      prisma.user.count({ where: { createdAt: { gte: start, lte: end }, role: 'CUSTOMER' } }),
    ]);
    const revenue = paid._sum.grandTotal || 0;
    const cost = paid._sum.costTotal || 0;
    const netSales = (paid._sum.subtotal || 0) - (paid._sum.discountTotal || 0);
    return {
      revenue,
      netSales,
      cost,
      grossProfit: netSales - cost,
      discount: paid._sum.discountTotal || 0,
      tax: paid._sum.taxTotal || 0,
      shipping: paid._sum.shippingTotal || 0,
      paidOrders: paid._count || 0,
      totalOrders: all,
      aov: Math.round(paid._avg.grandTotal || 0),
      itemsSold: itemsAgg._sum.quantity || 0,
      newCustomers: customers,
      conversion: all ? Math.round(((paid._count || 0) / all) * 1000) / 10 : 0,
    };
  };

  const [current, previous] = await Promise.all([agg(from, to), agg(prevFrom, prevTo)]);

  const delta = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : a > 0 ? 100 : 0);

  return {
    current,
    previous,
    deltas: {
      revenue: delta(current.revenue, previous.revenue),
      grossProfit: delta(current.grossProfit, previous.grossProfit),
      paidOrders: delta(current.paidOrders, previous.paidOrders),
      aov: delta(current.aov, previous.aov),
      itemsSold: delta(current.itemsSold, previous.itemsSold),
      newCustomers: delta(current.newCustomers, previous.newCustomers),
    },
    margin: current.netSales > 0 ? Math.round((current.grossProfit / current.netSales) * 1000) / 10 : 0,
  };
}

/* --------------------------------------------------------- تفکیک‌ها */

export async function breakdowns({ from, to }) {
  const where = { order: { createdAt: { gte: from, lte: to }, status: { in: PAID_STATES } } };

  const [items, orders, payments, statusGroups] = await Promise.all([
    prisma.orderItem.findMany({
      where,
      select: { productId: true, nameSnap: true, imageSnap: true, quantity: true, lineTotal: true, costPrice: true, size: true, color: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to }, status: { in: PAID_STATES } },
      select: { id: true, couponCode: true, grandTotal: true, discountTotal: true, createdAt: true, userId: true, shippingMethod: true },
    }),
    prisma.payment.groupBy({
      by: ['gateway', 'status'],
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: from, lte: to } },
      _count: true,
      _sum: { grandTotal: true },
    }),
  ]);

  // پرفروش‌ترین محصولات
  const byProduct = new Map();
  for (const it of items) {
    const k = it.productId || it.nameSnap;
    if (!byProduct.has(k)) byProduct.set(k, { id: it.productId, name: it.nameSnap, image: it.imageSnap, qty: 0, revenue: 0, cost: 0 });
    const p = byProduct.get(k);
    p.qty += it.quantity;
    p.revenue += it.lineTotal;
    p.cost += it.costPrice * it.quantity;
  }
  const topProducts = [...byProduct.values()]
    .map((p) => ({ ...p, profit: p.revenue - p.cost }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // دسته‌بندی
  const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))];
  const prods = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, category: { select: { name: true } } } })
    : [];
  const catOf = new Map(prods.map((p) => [p.id, p.category?.name || 'بدون دسته']));
  const byCat = new Map();
  for (const it of items) {
    const c = catOf.get(it.productId) || 'بدون دسته';
    byCat.set(c, (byCat.get(c) || 0) + it.lineTotal);
  }
  const categoryShare = [...byCat].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // سایز و رنگ
  const bySize = new Map(), byColor = new Map();
  for (const it of items) {
    if (it.size) bySize.set(it.size, (bySize.get(it.size) || 0) + it.quantity);
    if (it.color) byColor.set(it.color, (byColor.get(it.color) || 0) + it.quantity);
  }

  // کدهای تخفیف
  const byCoupon = new Map();
  for (const o of orders) {
    if (!o.couponCode) continue;
    if (!byCoupon.has(o.couponCode)) byCoupon.set(o.couponCode, { code: o.couponCode, uses: 0, discount: 0, revenue: 0 });
    const c = byCoupon.get(o.couponCode);
    c.uses++;
    c.discount += o.discountTotal;
    c.revenue += o.grandTotal;
  }

  // درگاه‌ها
  const gwMap = new Map();
  for (const p of payments) {
    if (!gwMap.has(p.gateway)) gwMap.set(p.gateway, { gateway: p.gateway, success: 0, failed: 0, pending: 0, amount: 0 });
    const g = gwMap.get(p.gateway);
    if (p.status === 'SUCCESS') { g.success += p._count; g.amount += p._sum.amount || 0; }
    else if (p.status === 'FAILED') g.failed += p._count;
    else g.pending += p._count;
  }

  // توزیع ساعتی (الگوی خرید)
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${h}`, orders: 0, revenue: 0 }));
  for (const o of orders) {
    const h = new Date(o.createdAt).getHours();
    hourly[h].orders++;
    hourly[h].revenue += o.grandTotal;
  }

  // روزهای هفته
  const dowNames = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
  const weekday = dowNames.map((name) => ({ name, orders: 0, revenue: 0 }));
  for (const o of orders) {
    const d = new Date(o.createdAt).getDay();
    weekday[d].orders++;
    weekday[d].revenue += o.grandTotal;
  }

  // مشتریان تکراری
  const byUser = new Map();
  for (const o of orders) if (o.userId) byUser.set(o.userId, (byUser.get(o.userId) || 0) + 1);
  const repeat = [...byUser.values()].filter((n) => n > 1).length;
  const uniqueBuyers = byUser.size;

  return {
    topProducts,
    categoryShare,
    sizeShare: [...bySize].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
    colorShare: [...byColor].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
    coupons: [...byCoupon.values()].sort((a, b) => b.uses - a.uses),
    gateways: [...gwMap.values()].sort((a, b) => b.amount - a.amount),
    statuses: statusGroups.map((s) => ({ status: s.status, count: s._count, amount: s._sum.grandTotal || 0 })),
    hourly,
    weekday,
    customers: { uniqueBuyers, repeat, repeatRate: uniqueBuyers ? Math.round((repeat / uniqueBuyers) * 1000) / 10 : 0 },
  };
}

/* ------------------------------------------------- صورت سود و زیان */

export async function profitAndLoss({ from, to }) {
  const [paid, expenses, refunds] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: from, lte: to }, status: { in: PAID_STATES } },
      _sum: { subtotal: true, discountTotal: true, taxTotal: true, shippingTotal: true, costTotal: true, grandTotal: true },
      _count: true,
    }),
    prisma.expense.groupBy({
      by: ['category'],
      where: { date: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: from, lte: to }, status: 'REFUNDED' },
      _sum: { grandTotal: true },
      _count: true,
    }),
  ]);

  const gross = paid._sum.subtotal || 0;
  const discounts = paid._sum.discountTotal || 0;
  const netSales = gross - discounts;
  const cogs = paid._sum.costTotal || 0;
  const grossProfit = netSales - cogs;
  const shippingIncome = paid._sum.shippingTotal || 0;
  const taxCollected = paid._sum.taxTotal || 0;
  const opex = expenses.reduce((s, e) => s + (e._sum.amount || 0), 0);
  const operatingProfit = grossProfit + shippingIncome - opex;
  const refunded = refunds._sum.grandTotal || 0;
  const netProfit = operatingProfit - refunded;

  const CAT_NAMES = {
    RENT: 'اجاره',
    PAYROLL: 'حقوق و دستمزد',
    MARKETING: 'بازاریابی و تبلیغات',
    OPERATING: 'هزینه‌های عملیاتی',
    IT: 'نرم‌افزار و زیرساخت',
    OTHER: 'سایر',
  };

  return {
    grossSales: gross,
    discounts,
    netSales,
    cogs,
    grossProfit,
    grossMargin: netSales ? Math.round((grossProfit / netSales) * 1000) / 10 : 0,
    shippingIncome,
    taxCollected,
    expenses: expenses.map((e) => ({ category: CAT_NAMES[e.category] || e.category, amount: e._sum.amount || 0 })).sort((a, b) => b.amount - a.amount),
    opex,
    operatingProfit,
    refunded,
    refundCount: refunds._count || 0,
    netProfit,
    netMargin: netSales ? Math.round((netProfit / netSales) * 1000) / 10 : 0,
    ordersCount: paid._count || 0,
    cashCollected: paid._sum.grandTotal || 0,
  };
}

/* ------------------------------------------------------- سلامت انبار */

export async function inventoryHealth(lowStockThreshold = 5) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { variants: true, category: { select: { name: true } } },
  });

  let totalUnits = 0, stockValue = 0, retailValue = 0;
  const low = [], out = [];

  for (const p of products) {
    const units = p.variants.reduce((s, v) => s + v.stock, 0);
    totalUnits += units;
    stockValue += units * (p.costPrice || 0);
    retailValue += units * p.price;
    const row = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category?.name || '—',
      units,
      price: p.price,
      soldCount: p.soldCount,
    };
    if (units === 0) out.push(row);
    else if (units <= lowStockThreshold) low.push(row);
  }

  return {
    productCount: products.length,
    variantCount: products.reduce((s, p) => s + p.variants.length, 0),
    totalUnits,
    stockValue,
    retailValue,
    potentialProfit: retailValue - stockValue,
    lowStock: low.sort((a, b) => a.units - b.units).slice(0, 20),
    outOfStock: out.slice(0, 20),
    lowCount: low.length,
    outCount: out.length,
  };
}

/* ------------------------------------------------------- دفتر کل */

export async function ledgerSummary({ from, to }) {
  const rows = await prisma.ledgerEntry.groupBy({
    by: ['type', 'account'],
    where: { date: { gte: from, lte: to } },
    _sum: { debit: true, credit: true },
    _count: true,
  });

  const accounts = rows.map((r) => ({
    type: r.type,
    account: r.account,
    debit: r._sum.debit || 0,
    credit: r._sum.credit || 0,
    entries: r._count,
  }));

  const totalDebit = accounts.reduce((s, a) => s + a.debit, 0);
  const totalCredit = accounts.reduce((s, a) => s + a.credit, 0);

  return {
    accounts: accounts.sort((a, b) => b.debit + b.credit - (a.debit + a.credit)),
    totalDebit,
    totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 1000, // اختلاف ناچیز ریالی
    difference: totalDebit - totalCredit,
  };
}
