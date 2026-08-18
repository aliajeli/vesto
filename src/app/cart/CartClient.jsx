'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useCart, useToast, apiFetch } from '@/components/Providers';
import { Icons, EmptyState, money, toFa, Spinner, ProductImage } from '@/components/ui';

export default function CartClient() {
  const cart = useCart();
  const { push } = useToast();
  const [priced, setPriced] = useState(null);
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);

  const recalc = useCallback(
    async (code = applied) => {
      if (!cart.items.length) { setPriced(null); return; }
      setLoading(true);
      try {
        const res = await apiFetch('/api/cart/price', {
          method: 'POST',
          body: {
            items: cart.items.map((i) => ({ productId: i.productId, variantId: i.variantId || null, quantity: i.quantity })),
            couponCode: code || null,
          },
        });
        setPriced(res.cart);
        if (res.cart.couponError) {
          push(res.cart.couponError, 'error');
          setApplied('');
        }
        (res.cart.warnings || []).forEach((w) => push(w, 'error'));
      } catch (e) {
        push(e.message, 'error');
      } finally {
        setLoading(false);
      }
    },
    [cart.items, applied, push]
  );

  useEffect(() => {
    if (cart.hydrated) recalc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.items, cart.hydrated]);

  const applyCoupon = async (e) => {
    e.preventDefault();
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    setApplied(code);
    await recalc(code);
    setCouponBusy(false);
  };

  if (!cart.hydrated) {
    return <div className="container-app py-24 grid place-items-center"><Spinner size={28} /></div>;
  }

  if (!cart.items.length) {
    return (
      <div className="container-app py-16">
        <EmptyState
          icon={Icons.cart}
          title="سبد خرید شما خالی است"
          hint="هنوز محصولی انتخاب نکرده‌اید. نگاهی به کالکشن‌های وستو بیندازید."
          action={<Link href="/shop" className="btn btn-primary mt-2">شروع خرید</Link>}
        />
      </div>
    );
  }

  const s = priced;

  return (
    <div className="container-app py-6 md:py-10">
      <h1 className="text-xl md:text-3xl font-extrabold mb-6">سبد خرید</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* اقلام */}
        <div className="lg:col-span-2 space-y-3">
          {cart.items.map((it) => {
            const key = cart.keyOf(it);
            const line = s?.items?.find((x) => x.productId === it.productId && (x.variantId || '') === (it.variantId || ''));
            return (
              <div key={key} className="card p-3 md:p-4 flex gap-3 md:gap-4">
                <Link href={`/product/${it.slug}`} className="shrink-0">
                  <ProductImage src={it.image} alt={it.name} className="w-[88px] md:w-28 rounded-theme" ratio="3/4" />
                </Link>

                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/product/${it.slug}`} className="text-sm md:text-base font-bold leading-6 line-clamp-2 hover:text-[var(--primary)]">
                      {it.name}
                    </Link>
                    <button onClick={() => cart.remove(key)} className="text-muted hover:text-[var(--danger)] shrink-0 p-1" aria-label="حذف">
                      <Icons.trash size={17} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted flex-wrap">
                    {it.size && <span>سایز: <b className="text-ink">{it.size}</b></span>}
                    {it.color && (
                      <span className="inline-flex items-center gap-1">
                        رنگ:
                        <span className="w-3 h-3 rounded-full border border-line" style={{ background: it.colorHex || '#888' }} />
                        <b className="text-ink">{it.color}</b>
                      </span>
                    )}
                  </div>

                  {line && line.stock <= 5 && (
                    <p className="text-[11px] mt-1.5 font-bold" style={{ color: 'var(--warning)' }}>
                      تنها {toFa(line.stock)} عدد موجود است
                    </p>
                  )}

                  <div className="mt-auto pt-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="inline-flex items-center rounded-theme border border-line overflow-hidden">
                      <button onClick={() => cart.setQty(key, it.quantity - 1)} className="w-9 h-9 grid place-items-center hover:bg-surface-2" aria-label="کاهش">
                        <Icons.minus size={15} />
                      </button>
                      <span className="w-10 text-center text-sm font-extrabold tabular">{toFa(it.quantity)}</span>
                      <button
                        onClick={() => cart.setQty(key, it.quantity + 1)}
                        disabled={line ? it.quantity >= line.stock : false}
                        className="w-9 h-9 grid place-items-center hover:bg-surface-2 disabled:opacity-40"
                        aria-label="افزایش"
                      >
                        <Icons.plus size={15} />
                      </button>
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] text-muted tabular">{money(it.unitPrice)} × {toFa(it.quantity)}</p>
                      <p className="text-base font-extrabold tabular" style={{ color: 'var(--primary)' }}>
                        {money(it.unitPrice * it.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between pt-2">
            <button onClick={cart.clear} className="text-xs text-muted hover:text-[var(--danger)] font-bold">
              خالی کردن سبد خرید
            </button>
            <Link href="/shop" className="btn btn-ghost btn-sm">
              <Icons.plus size={14} /> افزودن محصول دیگر
            </Link>
          </div>
        </div>

        {/* خلاصه */}
        <aside className="lg:sticky lg:top-24 self-start space-y-3">
          <div className="card p-5">
            <h2 className="font-extrabold mb-4">خلاصه سفارش</h2>

            {loading && !s ? (
              <div className="py-8 grid place-items-center"><Spinner size={22} /></div>
            ) : (
              <div className="space-y-2.5 text-sm">
                <Row label="جمع کالاها" value={money(s?.subtotal ?? cart.subtotal)} />
                {s?.discountTotal > 0 && (
                  <Row label={`تخفیف (${s.coupon?.code || ''})`} value={`− ${money(s.discountTotal)}`} tone="success" />
                )}
                {s?.taxTotal > 0 && <Row label={`مالیات (${toFa(s.taxPercent)}٪)`} value={money(s.taxTotal)} />}
                <Row
                  label="هزینه ارسال"
                  value={s?.shippingTotal === 0 ? 'رایگان' : money(s?.shippingTotal || 0)}
                  tone={s?.shippingTotal === 0 ? 'success' : undefined}
                />

                {s?.freeShippingRemaining > 0 && (
                  <p className="text-[11px] p-2.5 rounded-theme leading-6" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                    <Icons.truck size={13} className="inline ml-1" />
                    {money(s.freeShippingRemaining)} تا ارسال رایگان باقی مانده
                  </p>
                )}

                <div className="border-t border-line pt-3 mt-3 flex items-center justify-between">
                  <span className="font-extrabold">مبلغ قابل پرداخت</span>
                  <span className="text-lg font-extrabold tabular" style={{ color: 'var(--primary)' }}>
                    {money(s?.grandTotal ?? cart.subtotal)}
                  </span>
                </div>
              </div>
            )}

            <Link href="/checkout" className="btn btn-primary btn-lg w-full mt-5">
              ادامه و تسویه حساب
              <Icons.arrowLeft size={17} />
            </Link>
          </div>

          {/* کد تخفیف */}
          <div className="card p-5">
            <h3 className="text-sm font-extrabold mb-3 flex items-center gap-2">
              <Icons.ticket size={16} style={{ color: 'var(--primary)' }} />
              کد تخفیف
            </h3>
            {s?.coupon ? (
              <div className="flex items-center justify-between gap-2 p-3 rounded-theme" style={{ background: 'color-mix(in srgb, var(--success) 12%, transparent)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold" style={{ color: 'var(--success)' }}>{s.coupon.code}</p>
                  <p className="text-[11px] text-muted truncate">{s.coupon.description}</p>
                </div>
                <button
                  onClick={() => { setApplied(''); setCoupon(''); recalc(''); }}
                  className="text-muted hover:text-[var(--danger)] shrink-0"
                  aria-label="حذف کد"
                >
                  <Icons.close size={16} />
                </button>
              </div>
            ) : (
              <form onSubmit={applyCoupon} className="flex gap-2">
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  placeholder="مثلاً VESTO10"
                  className="input flex-1 tracking-widest text-center"
                  dir="ltr"
                  maxLength={40}
                />
                <button className="btn btn-soft shrink-0" disabled={couponBusy}>
                  {couponBusy ? <Spinner size={14} /> : 'اعمال'}
                </button>
              </form>
            )}
            <p className="text-[10px] text-muted mt-2.5 leading-5">
              کدهای فعال: <b>VESTO10</b> (۱۰٪) — <b>WELCOME20</b> (۲۰٪) — <b>FIX200</b> (۲۰۰ هزار تومان)
            </p>
          </div>

          <div className="card p-4 space-y-2.5">
            {[
              { i: Icons.shield, t: 'پرداخت امن با رمزنگاری SSL' },
              { i: Icons.refresh, t: '۷ روز ضمانت بازگشت کالا' },
              { i: Icons.truck, t: 'ارسال به سراسر ایران' },
            ].map((x) => (
              <p key={x.t} className="flex items-center gap-2 text-[11px] text-muted">
                <x.i size={15} style={{ color: 'var(--primary)' }} /> {x.t}
              </p>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="font-bold tabular" style={tone === 'success' ? { color: 'var(--success)' } : undefined}>
        {value}
      </span>
    </div>
  );
}
