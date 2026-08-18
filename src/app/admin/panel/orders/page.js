import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { PageHeader, StatCard } from '@/components/admin/AdminUI';
import OrdersManager from '@/components/admin/OrdersManager';
import ExportButton from '@/components/admin/ExportButton';
import { formatCompact, toFaDigits, groupDigits } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'مدیریت سفارش‌ها' };

const PAGE_SIZE = 15;
const PAID_STATES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export default async function OrdersPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp?.q || '').trim();
  const status = sp?.status || '';
  const page = Math.max(1, Number(sp?.page || 1));

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q } },
            { trackingCode: { contains: q } },
            { guestName: { contains: q } },
            { guestPhone: { contains: q } },
            { couponCode: { contains: q } },
            { user: { is: { name: { contains: q } } } },
            { user: { is: { phone: { contains: q } } } },
            { address: { is: { fullName: { contains: q } } } },
            { address: { is: { phone: { contains: q } } } },
          ],
        }
      : {}),
  };

  const [rows, total, counts, revAgg, pendingCount, todayAgg] = await Promise.all([
    prisma.order.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: {
        items: true,
        address: true,
        user: { select: { id: true, name: true, phone: true, email: true } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ['status'], _count: true }),
    prisma.order.aggregate({ where: { status: { in: PAID_STATES } }, _sum: { grandTotal: true }, _count: true }),
    prisma.order.count({ where: { status: 'PAID' } }),
    prisma.order.aggregate({
      where: { status: { in: PAID_STATES }, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      _sum: { grandTotal: true }, _count: true,
    }),
  ]);

  const orders = rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    subtotal: o.subtotal, discountTotal: o.discountTotal, shippingTotal: o.shippingTotal,
    taxTotal: o.taxTotal, grandTotal: o.grandTotal, costTotal: o.costTotal,
    couponCode: o.couponCode, note: o.note, trackingCode: o.trackingCode, shippingMethod: o.shippingMethod,
    customerName: o.address?.fullName || o.user?.name || o.guestName || 'مهمان',
    customerPhone: o.address?.phone || o.user?.phone || o.guestPhone || '',
    customerEmail: o.user?.email || '',
    isGuest: !o.userId,
    address: o.address
      ? { province: o.address.province, city: o.address.city, postalCode: o.address.postalCode, line1: o.address.line1 }
      : o.guestAddress ? { province: '', city: '', postalCode: '', line1: o.guestAddress } : null,
    items: o.items.map((i) => ({
      id: i.id, name: i.nameSnap, image: i.imageSnap, size: i.size, color: i.color,
      unitPrice: i.unitPrice, quantity: i.quantity, lineTotal: i.lineTotal, costPrice: i.costPrice,
    })),
    payments: o.payments.map((p) => ({
      id: p.id, gateway: p.gateway, amount: p.amount, status: p.status,
      authority: p.authority, refId: p.refId, cardPan: p.cardPan, failReason: p.failReason,
      verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    })),
  }));

  const cmap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <>
      <PageHeader title="مدیریت سفارش‌ها" subtitle={`${toFaDigits(groupDigits(total))} سفارش در نتیجه فیلتر فعلی`} icon="box">
        <ExportButton type="orders" range="all" label="خروجی سفارش‌ها" />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="فروش امروز" value={formatCompact(todayAgg._sum.grandTotal || 0)} suffix="تومان" icon="chart" tone="success" hint={`${toFaDigits(todayAgg._count)} سفارش امروز`} />
        <StatCard label="کل فروش موفق" value={formatCompact(revAgg._sum.grandTotal || 0)} suffix="تومان" icon="wallet" hint={`${toFaDigits(groupDigits(revAgg._count))} سفارش`} />
        <StatCard label="در انتظار آماده‌سازی" value={toFaDigits(pendingCount)} icon="clock" tone="warning" hint="نیازمند اقدام شما" />
        <StatCard label="در انتظار پرداخت" value={toFaDigits(cmap.PENDING || 0)} icon="alert" tone="danger" />
      </div>

      <OrdersManager
        orders={orders}
        total={total}
        page={page}
        pages={Math.ceil(total / PAGE_SIZE) || 1}
        q={q}
        status={status}
        counts={cmap}
      />
    </>
  );
}
