import Link from 'next/link';
import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Icons } from '@/components/icons';
import { formatPrice, toFaDigits, groupDigits } from '@/lib/money';
import LogoutButton from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'حساب کاربری' };

const STATUS = {
  PENDING: { label: 'در انتظار پرداخت', tone: 'var(--warning)' },
  PAID: { label: 'پرداخت‌شده', tone: 'var(--success)' },
  PROCESSING: { label: 'در حال آماده‌سازی', tone: 'var(--accent)' },
  SHIPPED: { label: 'ارسال‌شده', tone: 'var(--accent)' },
  DELIVERED: { label: 'تحویل‌شده', tone: 'var(--success)' },
  CANCELLED: { label: 'لغو‌شده', tone: 'var(--danger)' },
  REFUNDED: { label: 'مسترد‌شده', tone: 'var(--text-muted)' },
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account');

  const [orders, addresses, stats] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.address.findMany({ where: { userId: user.id } }),
    prisma.order.aggregate({
      where: { userId: user.id, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
      _sum: { grandTotal: true },
      _count: true,
    }),
  ]);

  const cards = [
    { icon: Icons.package, label: 'سفارش‌های موفق', value: toFaDigits(stats._count || 0) },
    { icon: Icons.wallet, label: 'مجموع خرید', value: formatPrice(stats._sum.grandTotal || 0) },
    { icon: Icons.pin, label: 'نشانی‌های ذخیره‌شده', value: toFaDigits(addresses.length) },
  ];

  return (
    <Shell>
      <div className="container-app py-6 md:py-10">
        {/* هدر */}
        <div className="card p-5 md:p-6 mb-5 flex items-center gap-4 flex-wrap">
          <span
            className="w-14 h-14 rounded-full grid place-items-center text-xl font-extrabold shrink-0"
            style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
          >
            {user.name.charAt(0)}
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-xl font-extrabold">{user.name}</h1>
            <p className="text-xs text-muted mt-0.5" dir="ltr">{user.email || user.phone}</p>
          </div>
          <LogoutButton />
        </div>

        {/* آمار */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {cards.map((c) => (
            <div key={c.label} className="card p-4 flex items-center gap-3">
              <span className="w-11 h-11 rounded-theme grid place-items-center shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                <c.icon size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-muted">{c.label}</p>
                <p className="text-sm font-extrabold tabular truncate">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* سفارش‌ها */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h2 className="font-extrabold flex items-center gap-2">
              <Icons.package size={18} style={{ color: 'var(--primary)' }} /> سفارش‌های اخیر
            </h2>
            <Link href="/shop" className="btn btn-ghost btn-sm">خرید جدید</Link>
          </div>

          {orders.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-muted mb-4">هنوز سفارشی ثبت نکرده‌اید.</p>
              <Link href="/shop" className="btn btn-primary">مشاهده محصولات</Link>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {orders.map((o) => {
                const st = STATUS[o.status] || STATUS.PENDING;
                return (
                  <li key={o.id} className="p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold tabular" dir="ltr">{o.orderNumber}</p>
                        <p className="text-[11px] text-muted mt-1">
                          {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(o.createdAt)}
                        </p>
                      </div>
                      <span className="badge" style={{ background: `color-mix(in srgb, ${st.tone} 15%, transparent)`, color: st.tone }}>
                        {st.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3 scroll-x no-scrollbar">
                      {o.items.slice(0, 6).map((it) => (
                        <span key={it.id} className="w-11 h-14 rounded-[8px] overflow-hidden shrink-0" style={{ background: 'var(--surface-2)' }} title={it.nameSnap}>
                          {it.imageSnap && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.imageSnap} alt="" className="w-full h-full object-cover" />
                          )}
                        </span>
                      ))}
                      {o.items.length > 6 && (
                        <span className="text-[11px] text-muted shrink-0">+{toFaDigits(o.items.length - 6)}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-xs text-muted">
                        {toFaDigits(o.items.length)} قلم — مبلغ{' '}
                        <b className="text-ink tabular">{formatPrice(o.grandTotal)}</b>
                      </p>
                      <Link href={`/track?order=${o.orderNumber}`} className="btn btn-ghost btn-sm">
                        جزئیات و پیگیری <Icons.chevronLeft size={13} />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* نشانی‌ها */}
        {addresses.length > 0 && (
          <div className="card mt-5 overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="font-extrabold flex items-center gap-2">
                <Icons.pin size={18} style={{ color: 'var(--primary)' }} /> نشانی‌های من
              </h2>
            </div>
            <ul className="divide-y divide-line">
              {addresses.map((a) => (
                <li key={a.id} className="p-4 md:p-5 text-xs leading-6">
                  <p className="font-extrabold text-sm">{a.fullName} — <span className="tabular">{toFaDigits(a.phone)}</span></p>
                  <p className="text-muted mt-1">{a.province}، {a.city}، {a.line1}</p>
                  <p className="text-muted tabular">کد پستی: {toFaDigits(a.postalCode)}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Shell>
  );
}
