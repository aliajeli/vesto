import Link from 'next/link';
import { Suspense } from 'react';
import prisma from '@/lib/db';
import { Icons } from '@/components/icons';
import ClearCart from './ClearCart';
import { formatPrice, toFaDigits } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'نتیجه پرداخت', robots: { index: false } };

const STATES = {
  success: {
    icon: 'check',
    color: 'var(--success)',
    title: 'پرداخت با موفقیت انجام شد',
    text: 'سفارش شما ثبت شد و به‌زودی پردازش می‌شود. جزئیات به شماره‌ی شما پیامک خواهد شد.',
  },
  failed: {
    icon: 'close',
    color: 'var(--danger)',
    title: 'پرداخت ناموفق بود',
    text: 'مبلغی از حساب شما کسر نشده است. در صورت کسر وجه، حداکثر تا ۷۲ ساعت بازگردانده می‌شود.',
  },
  cancelled: {
    icon: 'close',
    color: 'var(--warning)',
    title: 'پرداخت لغو شد',
    text: 'شما از ادامه‌ی پرداخت انصراف دادید. سبد خرید شما محفوظ است.',
  },
  pending: {
    icon: 'clock',
    color: 'var(--warning)',
    title: 'وضعیت پرداخت در حال بررسی است',
    text: 'تراکنش شما در حال بررسی است. در صورت موفقیت، سفارش به‌صورت خودکار تأیید می‌شود.',
  },
  tampered: {
    icon: 'shield',
    color: 'var(--danger)',
    title: 'تراکنش نامعتبر تشخیص داده شد',
    text: 'سامانه‌ی امنیتی وستو مغایرت در اطلاعات تراکنش را شناسایی کرد و پرداخت را رد نمود. این رویداد ثبت شده است.',
  },
  invalid: {
    icon: 'alert',
    color: 'var(--danger)',
    title: 'تراکنش یافت نشد',
    text: 'اطلاعات این پرداخت در سیستم موجود نیست.',
  },
};

export default async function PaymentResult({ searchParams }) {
  const sp = await searchParams;
  const status = STATES[sp?.status] ? sp.status : 'invalid';
  const state = STATES[status];
  const orderNumber = sp?.order || '';
  const ref = sp?.ref || '';

  let order = null;
  if (orderNumber) {
    order = await prisma.order
      .findUnique({
        where: { orderNumber },
        include: { items: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
      })
      .catch(() => null);
  }

  const Icon = Icons[state.icon] || Icons.alert;

  return (
    <div className="min-h-screen grid place-items-center p-4" style={{ background: 'var(--bg-soft)' }}>
      {status === 'success' && <ClearCart />}
      <div className="w-full max-w-lg">
        <div className="card shadow-theme overflow-hidden">
          <div className="p-8 text-center">
            <div
              className="w-20 h-20 rounded-full grid place-items-center mx-auto mb-5"
              style={{ background: `color-mix(in srgb, ${state.color} 16%, transparent)`, color: state.color }}
            >
              <Icon size={38} strokeWidth={2.2} />
            </div>
            <h1 className="text-xl font-extrabold mb-2">{state.title}</h1>
            <p className="text-sm text-muted leading-7 max-w-sm mx-auto">{state.text}</p>
          </div>

          {order && (
            <div className="px-6 pb-6">
              <div className="rounded-theme p-4 space-y-2.5 text-sm" style={{ background: 'var(--bg-soft)' }}>
                <Row label="شماره سفارش" value={order.orderNumber} mono />
                {ref && <Row label="کد رهگیری بانک" value={toFaDigits(ref)} mono />}
                <Row label="مبلغ" value={formatPrice(order.grandTotal)} />
                <Row label="تعداد اقلام" value={toFaDigits(order.items.length) + ' قلم'} />
                <Row
                  label="وضعیت سفارش"
                  value={
                    { PENDING: 'در انتظار پرداخت', PAID: 'پرداخت‌شده', PROCESSING: 'در حال آماده‌سازی', SHIPPED: 'ارسال‌شده', DELIVERED: 'تحویل‌شده', CANCELLED: 'لغو‌شده', REFUNDED: 'مسترد‌شده' }[order.status] || order.status
                  }
                />
              </div>

              {status === 'success' && (
                <ul className="mt-4 space-y-2">
                  {order.items.slice(0, 4).map((it) => (
                    <li key={it.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate flex-1">
                        {it.nameSnap}
                        {it.size ? ` — ${it.size}` : ''}
                        {it.color ? ` / ${it.color}` : ''}
                      </span>
                      <span className="text-muted tabular shrink-0">×{toFaDigits(it.quantity)}</span>
                    </li>
                  ))}
                  {order.items.length > 4 && (
                    <li className="text-xs text-muted">و {toFaDigits(order.items.length - 4)} قلم دیگر…</li>
                  )}
                </ul>
              )}
            </div>
          )}

          <div className="p-6 pt-0 grid grid-cols-2 gap-2">
            <Link href="/" className="btn btn-ghost">بازگشت به فروشگاه</Link>
            {status === 'success' ? (
              <Link href={`/track?order=${orderNumber}`} className="btn btn-primary">پیگیری سفارش</Link>
            ) : (
              <Link href="/cart" className="btn btn-primary">بازگشت به سبد خرید</Link>
            )}
          </div>
        </div>

        {status === 'tampered' && (
          <p className="text-[11px] text-center text-muted mt-4 leading-6">
            <Icons.shield size={12} className="inline" /> سامانه‌ی ضدجعل وستو: تمام تراکنش‌ها با امضای دیجیتال HMAC-SHA256
            و تأیید سرور-به-سرور اعتبارسنجی می‌شوند.
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={`font-bold truncate ${mono ? 'tabular' : ''}`} dir={mono ? 'ltr' : 'rtl'}>{value}</span>
    </div>
  );
}
