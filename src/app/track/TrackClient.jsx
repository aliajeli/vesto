'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/Providers';
import { Icons, money, toFa, faDate, Spinner, EmptyState } from '@/components/ui';

const STEPS = [
  { id: 'PENDING', label: 'ثبت سفارش', icon: 'check' },
  { id: 'PAID', label: 'پرداخت شد', icon: 'wallet' },
  { id: 'PROCESSING', label: 'آماده‌سازی', icon: 'box' },
  { id: 'SHIPPED', label: 'ارسال شد', icon: 'truck' },
  { id: 'DELIVERED', label: 'تحویل شد', icon: 'home' },
];

export default function TrackClient() {
  const sp = useSearchParams();
  const { push } = useToast();
  const [orderNumber, setOrderNumber] = useState(sp.get('order') || '');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);

  const lookup = async (num = orderNumber, ph = phone) => {
    if (!num.trim()) return;
    setBusy(true);
    try {
      const p = new URLSearchParams({ order: num.trim() });
      if (ph.trim()) p.set('phone', ph.trim());
      const res = await fetch(`/api/track?${p}`);
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'سفارش یافت نشد.');
      setOrder(data.order);
    } catch (e) {
      setOrder(null);
      push(e.message, 'error');
    } finally {
      setBusy(false);
      setSearched(true);
    }
  };

  useEffect(() => {
    if (sp.get('order')) lookup(sp.get('order'), '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeIdx = order ? Math.max(0, STEPS.findIndex((s) => s.id === order.status)) : -1;
  const cancelled = order?.status === 'CANCELLED' || order?.status === 'REFUNDED';

  return (
    <div className="container-app py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-full grid place-items-center mx-auto mb-3" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
            <Icons.package size={26} />
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold">پیگیری سفارش</h1>
          <p className="text-xs text-muted mt-1.5">شماره سفارش خود را وارد کنید تا وضعیت آن را ببینید.</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); lookup(); }}
          className="card p-5 grid sm:grid-cols-[1fr_auto] gap-3 mb-6"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">شماره سفارش</label>
              <input className="input tabular" dir="ltr" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value.toUpperCase())} placeholder="VS-20250101-A1B2C3" required />
            </div>
            <div>
              <label className="label">شماره موبایل (برای سفارش مهمان)</label>
              <input className="input tabular" dir="ltr" inputMode="numeric" maxLength={11} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="09121234567" />
            </div>
          </div>
          <button className="btn btn-primary self-end" disabled={busy}>
            {busy ? <Spinner size={16} /> : <Icons.search size={16} />} جستجو
          </button>
        </form>

        {busy && !order && <div className="py-10 grid place-items-center"><Spinner size={26} /></div>}

        {searched && !order && !busy && (
          <EmptyState icon={Icons.search} title="سفارشی یافت نشد" hint="شماره سفارش یا موبایل را بررسی کنید و دوباره تلاش کنید." />
        )}

        {order && (
          <div className="space-y-4 animate-fade-up">
            {/* وضعیت */}
            <div className="card p-5 md:p-6">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
                <div>
                  <p className="text-sm font-extrabold tabular" dir="ltr">{order.orderNumber}</p>
                  <p className="text-[11px] text-muted mt-1">ثبت‌شده در {faDate(order.createdAt, true)}</p>
                </div>
                <span className="text-lg font-extrabold tabular" style={{ color: 'var(--primary)' }}>
                  {money(order.grandTotal)}
                </span>
              </div>

              {cancelled ? (
                <div className="p-4 rounded-theme flex items-center gap-3" style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)' }}>
                  <Icons.alert size={22} style={{ color: 'var(--danger)' }} />
                  <div>
                    <p className="text-sm font-extrabold" style={{ color: 'var(--danger)' }}>
                      {order.status === 'CANCELLED' ? 'این سفارش لغو شده است' : 'مبلغ این سفارش مسترد شده است'}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5">در صورت کسر وجه، مبلغ تا ۷۲ ساعت بازگردانده می‌شود.</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute top-[18px] right-[18px] left-[18px] h-0.5" style={{ background: 'var(--border)' }} />
                  <div
                    className="absolute top-[18px] right-[18px] h-0.5 transition-all duration-700"
                    style={{ width: `calc(${(activeIdx / (STEPS.length - 1)) * 100}% - ${activeIdx === 0 ? 0 : 0}px)`, maxWidth: 'calc(100% - 36px)', background: 'var(--primary)' }}
                  />
                  <ol className="relative flex justify-between">
                    {STEPS.map((st, i) => {
                      const done = i <= activeIdx;
                      const I = Icons[st.icon];
                      return (
                        <li key={st.id} className="flex flex-col items-center gap-2 text-center" style={{ width: 70 }}>
                          <span
                            className="w-9 h-9 rounded-full grid place-items-center shrink-0 transition-colors"
                            style={done
                              ? { background: 'var(--primary)', color: 'var(--primary-contrast)' }
                              : { background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                          >
                            <I size={16} />
                          </span>
                          <span className="text-[10px] font-bold leading-4" style={{ color: done ? 'var(--text)' : 'var(--text-muted)' }}>
                            {st.label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {order.trackingCode && (
                <div className="mt-6 p-3.5 rounded-theme flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--surface-2)' }}>
                  <span className="text-xs text-muted">کد رهگیری پستی</span>
                  <span className="text-sm font-extrabold tabular" dir="ltr">{toFa(order.trackingCode)}</span>
                </div>
              )}
            </div>

            {/* اقلام */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h2 className="font-extrabold text-sm">اقلام سفارش</h2>
              </div>
              <ul className="divide-y divide-line">
                {order.items.map((it) => (
                  <li key={it.id} className="p-4 flex items-center gap-3">
                    <span className="w-12 h-16 rounded-[8px] overflow-hidden shrink-0" style={{ background: 'var(--surface-2)' }}>
                      {it.imageSnap && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.imageSnap} alt="" className="w-full h-full object-cover" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold line-clamp-2">{it.nameSnap}</p>
                      <p className="text-[11px] text-muted mt-1">
                        {it.size && `سایز ${it.size}`}{it.color && ` — ${it.color}`} × {toFa(it.quantity)}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold tabular shrink-0">{money(it.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="p-5 space-y-2 text-sm border-t border-line">
                <Row label="جمع کالاها" value={money(order.subtotal)} />
                {order.discountTotal > 0 && <Row label="تخفیف" value={`− ${money(order.discountTotal)}`} tone="success" />}
                {order.taxTotal > 0 && <Row label="مالیات" value={money(order.taxTotal)} />}
                <Row label="ارسال" value={order.shippingTotal === 0 ? 'رایگان' : money(order.shippingTotal)} />
                <div className="border-t border-line pt-2.5 flex items-center justify-between">
                  <span className="font-extrabold">مبلغ کل</span>
                  <span className="font-extrabold tabular" style={{ color: 'var(--primary)' }}>{money(order.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="font-bold tabular" style={tone === 'success' ? { color: 'var(--success)' } : undefined}>{value}</span>
    </div>
  );
}
