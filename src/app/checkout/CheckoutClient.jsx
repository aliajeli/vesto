'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useCart, useToast, apiFetch } from '@/components/Providers';
import { Icons, money, toFa, Spinner, EmptyState } from '@/components/ui';

const PROVINCES = ['تهران', 'اصفهان', 'فارس', 'خراسان رضوی', 'آذربایجان شرقی', 'آذربایجان غربی', 'گیلان', 'مازندران', 'البرز', 'خوزستان', 'کرمان', 'یزد', 'قم', 'مرکزی', 'همدان', 'کرمانشاه', 'سیستان و بلوچستان', 'هرمزگان', 'گلستان', 'اردبیل', 'زنجان', 'قزوین', 'لرستان', 'بوشهر', 'کردستان', 'سمنان', 'چهارمحال و بختیاری', 'خراسان شمالی', 'خراسان جنوبی', 'کهگیلویه و بویراحمد', 'ایلام'];

export default function CheckoutClient({ user, addresses, gateways, defaultGateway, allowGuest }) {
  const cart = useCart();
  const { push } = useToast();

  const [step, setStep] = useState(1);
  const [priced, setPriced] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState('');

  const [addressId, setAddressId] = useState(addresses[0]?.id || '');
  const [newAddress, setNewAddress] = useState(!addresses.length);
  const [form, setForm] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    province: 'تهران',
    city: 'تهران',
    postalCode: '',
    line1: '',
  });
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [gateway, setGateway] = useState(
    gateways.find((g) => g.id === defaultGateway)?.id || gateways[0]?.id || 'sandbox'
  );
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});

  const recalc = useCallback(
    async (code = applied) => {
      if (!cart.items.length) { setPriced(null); setLoading(false); return; }
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
        if (res.cart.couponError) { push(res.cart.couponError, 'error'); setApplied(''); }
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

  const validate = () => {
    const e = {};
    if (!user || newAddress) {
      if (!form.fullName || form.fullName.trim().length < 2) e.fullName = 'نام و نام خانوادگی را وارد کنید.';
      if (!/^09\d{9}$/.test(form.phone.trim())) e.phone = 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.';
      if (!form.province) e.province = 'استان را انتخاب کنید.';
      if (!form.city || form.city.trim().length < 2) e.city = 'نام شهر را وارد کنید.';
      if (!/^\d{10}$/.test(form.postalCode.trim())) e.postalCode = 'کد پستی باید دقیقاً ۱۰ رقم باشد.';
      if (!form.line1 || form.line1.trim().length < 5) e.line1 = 'نشانی را کامل‌تر وارد کنید.';
    } else if (!addressId) {
      e.addressId = 'یک نشانی انتخاب کنید.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) { setStep(1); push('لطفاً خطاهای فرم را برطرف کنید.', 'error'); return; }
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/checkout', {
        method: 'POST',
        body: {
          items: cart.items.map((i) => ({ productId: i.productId, variantId: i.variantId || null, quantity: i.quantity })),
          couponCode: applied || null,
          gateway,
          shippingMethod,
          note: note || '',
          addressId: user && !newAddress ? addressId : '',
          guest: !user || newAddress ? {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            province: form.province,
            city: form.city.trim(),
            postalCode: form.postalCode.trim(),
            line1: form.line1.trim(),
          } : undefined,
        },
      });
      push('در حال انتقال به درگاه پرداخت…', 'success');
      window.location.href = res.redirectUrl;
    } catch (e) {
      push(e.message, 'error');
      setSubmitting(false);
    }
  };

  if (!cart.hydrated || (loading && !priced)) {
    return <div className="container-app py-24 grid place-items-center"><Spinner size={28} /></div>;
  }

  if (!cart.items.length) {
    return (
      <div className="container-app py-16">
        <EmptyState
          icon={Icons.cart}
          title="سبد خرید خالی است"
          hint="برای تسویه حساب ابتدا محصولی به سبد اضافه کنید."
          action={<Link href="/shop" className="btn btn-primary mt-2">مشاهده محصولات</Link>}
        />
      </div>
    );
  }

  const s = priced;
  const steps = [
    { n: 1, label: 'اطلاعات گیرنده' },
    { n: 2, label: 'روش ارسال' },
    { n: 3, label: 'پرداخت' },
  ];

  return (
    <div className="container-app py-6 md:py-10">
      <h1 className="text-xl md:text-3xl font-extrabold mb-6">تسویه حساب</h1>

      {/* مراحل */}
      <div className="flex items-center gap-2 mb-7 overflow-x-auto no-scrollbar">
        {steps.map((st, i) => (
          <div key={st.n} className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setStep(st.n)}
              className="flex items-center gap-2 px-1"
            >
              <span
                className="w-7 h-7 rounded-full grid place-items-center text-xs font-extrabold shrink-0 transition-colors"
                style={step >= st.n
                  ? { background: 'var(--primary)', color: 'var(--primary-contrast)' }
                  : { background: 'var(--surface-2)', color: 'var(--text-muted)' }}
              >
                {step > st.n ? <Icons.check size={14} strokeWidth={3} /> : toFa(st.n)}
              </span>
              <span className="text-xs font-extrabold whitespace-nowrap" style={{ color: step >= st.n ? 'var(--text)' : 'var(--text-muted)' }}>
                {st.label}
              </span>
            </button>
            {i < steps.length - 1 && <span className="w-6 md:w-12 h-px" style={{ background: 'var(--border)' }} />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* ---------------- مرحله ۱ ---------------- */}
          {step === 1 && (
            <div className="card p-5 md:p-6 animate-fade-up">
              <h2 className="font-extrabold mb-4 flex items-center gap-2">
                <Icons.pin size={18} style={{ color: 'var(--primary)' }} /> اطلاعات گیرنده
              </h2>

              {!user && (
                <div className="mb-5 p-3.5 rounded-theme flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--primary-soft)' }}>
                  <p className="text-xs leading-6">
                    حساب کاربری دارید؟ برای پیگیری آسان سفارش‌ها وارد شوید.
                  </p>
                  <Link href="/login?next=/checkout" className="btn btn-soft btn-sm shrink-0">ورود به حساب</Link>
                </div>
              )}

              {user && addresses.length > 0 && (
                <div className="space-y-2 mb-5">
                  {addresses.map((a) => (
                    <label
                      key={a.id}
                      className="flex items-start gap-3 p-3.5 rounded-theme border cursor-pointer transition-colors"
                      style={{ borderColor: !newAddress && addressId === a.id ? 'var(--primary)' : 'var(--border)', background: !newAddress && addressId === a.id ? 'var(--primary-soft)' : 'transparent' }}
                    >
                      <input
                        type="radio"
                        name="addr"
                        checked={!newAddress && addressId === a.id}
                        onChange={() => { setNewAddress(false); setAddressId(a.id); }}
                        className="mt-1 accent-[var(--primary)]"
                      />
                      <div className="min-w-0 text-xs leading-6">
                        <p className="font-extrabold text-sm">{a.fullName} — {a.phone}</p>
                        <p className="text-muted">{a.province}، {a.city}، {a.line1}</p>
                        <p className="text-muted tabular">کد پستی: {toFa(a.postalCode)}</p>
                      </div>
                    </label>
                  ))}
                  <button
                    onClick={() => setNewAddress(!newAddress)}
                    className="btn btn-ghost btn-sm w-full"
                    style={newAddress ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : undefined}
                  >
                    <Icons.plus size={14} /> {newAddress ? 'استفاده از نشانی ذخیره‌شده' : 'افزودن نشانی جدید'}
                  </button>
                </div>
              )}

              {(!user || newAddress) && (
                <div className="grid sm:grid-cols-2 gap-3.5">
                  <Field label="نام و نام خانوادگی" error={errors.fullName} className="sm:col-span-2">
                    <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="مثلاً سارا محمدی" />
                  </Field>
                  <Field label="شماره موبایل" error={errors.phone}>
                    <input className="input tabular" dir="ltr" inputMode="numeric" maxLength={11} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} placeholder="09121234567" />
                  </Field>
                  <Field label="کد پستی (۱۰ رقم)" error={errors.postalCode}>
                    <input className="input tabular" dir="ltr" inputMode="numeric" maxLength={10} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value.replace(/\D/g, '') })} placeholder="1234567890" />
                  </Field>
                  <Field label="استان" error={errors.province}>
                    <select className="input" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                      {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="شهر" error={errors.city}>
                    <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="مثلاً تهران" />
                  </Field>
                  <Field label="نشانی کامل" error={errors.line1} className="sm:col-span-2">
                    <textarea rows={3} className="input resize-none" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder="خیابان، کوچه، پلاک، واحد" />
                  </Field>
                </div>
              )}

              <button onClick={() => { if (validate()) setStep(2); }} className="btn btn-primary w-full mt-5">
                ادامه <Icons.arrowLeft size={16} />
              </button>
            </div>
          )}

          {/* ---------------- مرحله ۲ ---------------- */}
          {step === 2 && (
            <div className="card p-5 md:p-6 animate-fade-up">
              <h2 className="font-extrabold mb-4 flex items-center gap-2">
                <Icons.truck size={18} style={{ color: 'var(--primary)' }} /> روش ارسال
              </h2>
              <div className="space-y-2.5">
                {[
                  { id: 'standard', title: 'پست پیشتاز (استاندارد)', desc: 'تحویل ۲ تا ۴ روز کاری', extra: 0 },
                  { id: 'express', title: 'ارسال فوری (تیپاکس)', desc: 'تحویل ۱ تا ۲ روز کاری', extra: 0 },
                ].map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 p-4 rounded-theme border cursor-pointer transition-colors"
                    style={{ borderColor: shippingMethod === m.id ? 'var(--primary)' : 'var(--border)', background: shippingMethod === m.id ? 'var(--primary-soft)' : 'transparent' }}
                  >
                    <input type="radio" name="ship" checked={shippingMethod === m.id} onChange={() => setShippingMethod(m.id)} className="accent-[var(--primary)]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold">{m.title}</p>
                      <p className="text-[11px] text-muted mt-0.5">{m.desc}</p>
                    </div>
                    <span className="text-xs font-bold shrink-0" style={{ color: s?.shippingTotal === 0 ? 'var(--success)' : undefined }}>
                      {s?.shippingTotal === 0 ? 'رایگان' : money(s?.shippingTotal || 0)}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-5">
                <label className="label">یادداشت سفارش (اختیاری)</label>
                <textarea rows={3} maxLength={500} className="input resize-none" value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: لطفاً قبل از ارسال تماس بگیرید." />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-5">
                <button onClick={() => setStep(1)} className="btn btn-ghost"><Icons.arrowRight size={16} /> بازگشت</button>
                <button onClick={() => setStep(3)} className="btn btn-primary">ادامه <Icons.arrowLeft size={16} /></button>
              </div>
            </div>
          )}

          {/* ---------------- مرحله ۳ ---------------- */}
          {step === 3 && (
            <div className="card p-5 md:p-6 animate-fade-up">
              <h2 className="font-extrabold mb-4 flex items-center gap-2">
                <Icons.wallet size={18} style={{ color: 'var(--primary)' }} /> روش پرداخت
              </h2>

              <div className="space-y-2.5">
                {gateways.map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-3 p-4 rounded-theme border cursor-pointer transition-colors"
                    style={{ borderColor: gateway === g.id ? 'var(--primary)' : 'var(--border)', background: gateway === g.id ? 'var(--primary-soft)' : 'transparent' }}
                  >
                    <input type="radio" name="gw" checked={gateway === g.id} onChange={() => setGateway(g.id)} className="accent-[var(--primary)]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold">{g.label}</p>
                      <p className="text-[11px] text-muted mt-0.5">
                        {g.id === 'sandbox' ? 'محیط تست — تراکنش واقعی انجام نمی‌شود' : 'پرداخت امن با کارت‌های عضو شتاب'}
                      </p>
                    </div>
                    <Icons.shield size={18} className="shrink-0" style={{ color: 'var(--primary)' }} />
                  </label>
                ))}
              </div>

              <div className="mt-5 p-3.5 rounded-theme text-[11px] leading-6 text-muted" style={{ background: 'var(--surface-2)' }}>
                <Icons.shield size={14} className="inline ml-1" style={{ color: 'var(--success)' }} />
                مبلغ نهایی در سرور محاسبه و با امضای دیجیتال <b className="text-ink">HMAC-SHA256</b> مهر می‌شود.
                پس از بازگشت از بانک، تراکنش به‌صورت سرور-به-سرور تأیید و مبلغ آن با سفارش مطابقت داده می‌شود؛
                بنابراین دستکاری مبلغ از سمت مرورگر غیرممکن است.
              </div>

              <div className="grid grid-cols-2 gap-2 mt-5">
                <button onClick={() => setStep(2)} disabled={submitting} className="btn btn-ghost">
                  <Icons.arrowRight size={16} /> بازگشت
                </button>
                <button onClick={submit} disabled={submitting} className="btn btn-primary">
                  {submitting ? <Spinner size={16} /> : <Icons.wallet size={16} />}
                  {submitting ? 'در حال انتقال…' : 'پرداخت'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* خلاصه سفارش */}
        <aside className="lg:sticky lg:top-24 self-start space-y-3">
          <div className="card p-5">
            <h2 className="font-extrabold mb-4">خلاصه سفارش</h2>

            <ul className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {cart.items.map((it) => (
                <li key={cart.keyOf(it)} className="flex gap-2.5 text-xs">
                  <span className="w-11 h-14 rounded-[8px] overflow-hidden shrink-0" style={{ background: 'var(--surface-2)' }}>
                    {it.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.image} alt="" className="w-full h-full object-cover" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold line-clamp-2 leading-5">{it.name}</p>
                    <p className="text-muted mt-0.5">
                      {it.size && `${it.size}`}{it.color && ` / ${it.color}`} × {toFa(it.quantity)}
                    </p>
                  </div>
                  <span className="font-bold tabular shrink-0">{money(it.unitPrice * it.quantity, '')}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-2.5 text-sm border-t border-line pt-3.5">
              <Row label="جمع کالاها" value={money(s?.subtotal || 0)} />
              {s?.discountTotal > 0 && <Row label="تخفیف" value={`− ${money(s.discountTotal)}`} tone="success" />}
              {s?.taxTotal > 0 && <Row label={`مالیات (${toFa(s.taxPercent)}٪)`} value={money(s.taxTotal)} />}
              <Row label="ارسال" value={s?.shippingTotal === 0 ? 'رایگان' : money(s?.shippingTotal || 0)} tone={s?.shippingTotal === 0 ? 'success' : undefined} />
              <div className="border-t border-line pt-3 flex items-center justify-between">
                <span className="font-extrabold">قابل پرداخت</span>
                <span className="text-lg font-extrabold tabular" style={{ color: 'var(--primary)' }}>{money(s?.grandTotal || 0)}</span>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-extrabold mb-3 flex items-center gap-2">
              <Icons.ticket size={16} style={{ color: 'var(--primary)' }} /> کد تخفیف
            </h3>
            {s?.coupon ? (
              <div className="flex items-center justify-between gap-2 p-3 rounded-theme" style={{ background: 'color-mix(in srgb, var(--success) 12%, transparent)' }}>
                <p className="text-sm font-extrabold" style={{ color: 'var(--success)' }}>{s.coupon.code}</p>
                <button onClick={() => { setApplied(''); setCoupon(''); recalc(''); }} className="text-muted hover:text-[var(--danger)]" aria-label="حذف">
                  <Icons.close size={16} />
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); const c = coupon.trim().toUpperCase(); if (c) { setApplied(c); recalc(c); } }}
                className="flex gap-2"
              >
                <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="کد تخفیف" className="input flex-1 text-center tracking-widest" dir="ltr" maxLength={40} />
                <button className="btn btn-soft shrink-0">اعمال</button>
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, error, children, className = '' }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {error && <p className="text-[11px] mt-1.5 font-bold" style={{ color: 'var(--danger)' }}>{error}</p>}
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
