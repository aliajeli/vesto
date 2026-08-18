'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, useToast } from '@/components/Providers';
import { Icons, Spinner, Switch, Tabs, toFa, group } from '@/components/ui';

const GATEWAYS = [
  { id: 'sandbox', name: 'شبیه‌ساز داخلی', desc: 'برای تست کامل جریان پرداخت بدون نیاز به درگاه واقعی', site: '', keyField: null },
  { id: 'zibal', name: 'زیبال', desc: 'درگاه پرداخت زیبال — مبلغ به ریال ارسال می‌شود', site: 'zibal.ir', keyField: 'zibalMerchant', keyLabel: 'Merchant ID زیبال' },
  { id: 'zarinpal', name: 'زرین‌پال', desc: 'درگاه پرداخت زرین‌پال نسخه ۴ — مبلغ به ریال', site: 'zarinpal.com', keyField: 'zarinpalMerchant', keyLabel: 'Merchant ID زرین‌پال (۳۶ نویسه)' },
  { id: 'payping', name: 'پی‌پینگ', desc: 'درگاه پرداخت پی‌پینگ — مبلغ به تومان ارسال می‌شود', site: 'payping.io', keyField: 'paypingToken', keyLabel: 'توکن API پی‌پینگ (Bearer)' },
];

const toT = (r) => String(Math.round(Number(r || 0) / 10));
const toR = (t) => Math.round(Number(t || 0) * 10);

export default function SettingsManager({ initial, hasKeys }) {
  const router = useRouter();
  const { push } = useToast();
  const [tab, setTab] = useState('sales');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    ...initial,
    shippingFlatT: toT(initial.shippingFlat),
    freeShippingThresholdT: toT(initial.freeShippingThreshold),
  });

  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  const payload = useMemo(() => {
    const { shippingFlatT, freeShippingThresholdT, ...rest } = f;
    return {
      ...rest,
      shippingFlat: toR(shippingFlatT),
      freeShippingThreshold: toR(freeShippingThresholdT),
      taxPercent: Number(f.taxPercent || 0),
      lowStockThreshold: Number(f.lowStockThreshold || 0),
      maxQtyPerItem: Number(f.maxQtyPerItem || 1),
    };
  }, [f]);

  const save = async () => {
    setBusy(true);
    try {
      await apiFetch('/api/admin/settings', { method: 'POST', body: { patch: payload } });
      push('تنظیمات با موفقیت ذخیره شد.', 'success');
      router.refresh();
    } catch (e) { push(e.message, 'error'); } finally { setBusy(false); }
  };

  const gw = GATEWAYS.find((g) => g.id === f.activeGateway) || GATEWAYS[0];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Tabs
          tabs={[
            { id: 'sales', label: 'فروش و ارسال' },
            { id: 'payment', label: 'درگاه پرداخت' },
            { id: 'contact', label: 'اطلاعات تماس' },
            { id: 'policies', label: 'قوانین' },
            { id: 'system', label: 'سیستم' },
          ]}
          active={tab}
          onChange={setTab}
        />
        <button onClick={save} disabled={busy} className="btn btn-primary btn-sm mr-auto">
          {busy ? <Spinner size={15} /> : <Icons.check size={15} />} ذخیره تنظیمات
        </button>
      </div>

      {tab === 'sales' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="قیمت‌گذاری و مالیات" icon="wallet">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="واحد پول (پسوند نمایشی)">
                <input className="input" value={f.currencySuffix} onChange={(e) => set({ currencySuffix: e.target.value })} />
              </Field>
              <Field label="درصد مالیات بر ارزش افزوده">
                <input type="number" dir="ltr" className="input tabular" value={f.taxPercent} onChange={(e) => set({ taxPercent: e.target.value })} min={0} max={100} />
              </Field>
            </div>
            <p className="text-[10px] text-muted mt-2">مالیات روی مبلغ پس از کسر تخفیف محاسبه می‌شود.</p>
          </Card>

          <Card title="هزینه ارسال" icon="truck">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="هزینه ارسال ثابت (تومان)">
                <input type="number" dir="ltr" className="input tabular" value={f.shippingFlatT} onChange={(e) => set({ shippingFlatT: e.target.value })} />
              </Field>
              <Field label="حد ارسال رایگان (تومان)">
                <input type="number" dir="ltr" className="input tabular" value={f.freeShippingThresholdT} onChange={(e) => set({ freeShippingThresholdT: e.target.value })} />
              </Field>
            </div>
            <div className="rounded-theme p-3 mt-3 text-[11px] leading-6" style={{ background: 'var(--primary-soft)' }}>
              <Icons.truck size={13} className="inline ml-1" style={{ color: 'var(--primary)' }} />
              سفارش‌های بالای <b className="tabular">{toFa(group(Number(f.freeShippingThresholdT || 0)))}</b> تومان ارسال رایگان دارند؛
              در غیر این‌صورت <b className="tabular">{toFa(group(Number(f.shippingFlatT || 0)))}</b> تومان دریافت می‌شود.
            </div>
          </Card>

          <Card title="موجودی و سبد خرید" icon="box">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="آستانه هشدار موجودی کم">
                <input type="number" dir="ltr" className="input tabular" value={f.lowStockThreshold} onChange={(e) => set({ lowStockThreshold: e.target.value })} min={0} />
              </Field>
              <Field label="حداکثر تعداد هر کالا در سبد">
                <input type="number" dir="ltr" className="input tabular" value={f.maxQtyPerItem} onChange={(e) => set({ maxQtyPerItem: e.target.value })} min={1} max={100} />
              </Field>
            </div>
          </Card>

          <Card title="فرآیند خرید" icon="cart">
            <Switch
              checked={f.allowGuestCheckout}
              onChange={(v) => set({ allowGuestCheckout: v })}
              label="خرید مهمان (بدون ثبت‌نام)"
              hint="اگر خاموش شود، کاربران باید پیش از پرداخت وارد حساب خود شوند."
            />
          </Card>
        </div>
      )}

      {tab === 'payment' && (
        <div className="space-y-4">
          <Card title="انتخاب درگاه پرداخت فعال" icon="wallet">
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {GATEWAYS.map((g) => {
                const on = f.activeGateway === g.id;
                const configured = g.keyField ? hasKeys[g.id] : true;
                return (
                  <button
                    key={g.id}
                    onClick={() => set({ activeGateway: g.id })}
                    className="text-right rounded-theme p-4 border-2 transition-all"
                    style={{ borderColor: on ? 'var(--primary)' : 'var(--border)', background: on ? 'var(--primary-soft)' : 'transparent' }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="w-9 h-9 rounded-theme grid place-items-center" style={{ background: on ? 'var(--primary)' : 'var(--surface-2)', color: on ? 'var(--primary-contrast)' : 'var(--text-muted)' }}>
                        <Icons.wallet size={17} />
                      </span>
                      {on && <Icons.check size={16} style={{ color: 'var(--primary)' }} />}
                    </div>
                    <p className="text-sm font-extrabold mb-1">{g.name}</p>
                    <p className="text-[10px] text-muted leading-5 mb-2">{g.desc}</p>
                    {g.site && <p className="text-[10px] tabular" dir="ltr" style={{ color: 'var(--accent)' }}>{g.site}</p>}
                    {g.keyField && (
                      <span className="badge mt-2 text-[9px]" style={{
                        background: configured ? 'color-mix(in srgb, var(--success) 14%, transparent)' : 'color-mix(in srgb, var(--warning) 14%, transparent)',
                        color: configured ? 'var(--success)' : 'var(--warning)',
                      }}>{configured ? '✓ کلید ثبت شده' : 'کلید ثبت نشده'}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="حالت آزمایشی" icon="shield">
            <Switch
              checked={f.gatewaySandbox}
              onChange={(v) => set({ gatewaySandbox: v })}
              label="فعال بودن حالت Sandbox / آزمایشی"
              hint="در این حالت پرداخت‌ها واقعی نیستند و از محیط تست درگاه یا شبیه‌ساز داخلی استفاده می‌شود. پیش از راه‌اندازی نهایی حتماً خاموش کنید."
            />
            {!f.gatewaySandbox && f.activeGateway !== 'sandbox' && (
              <div className="rounded-theme p-3 mt-3 text-[11px] leading-6 flex gap-2" style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', color: 'var(--danger)' }}>
                <Icons.alert size={15} className="shrink-0 mt-0.5" />
                <span>حالت واقعی فعال است. تراکنش‌ها از حساب مشتریان کسر خواهد شد. مطمئن شوید کلید درگاه صحیح است.</span>
              </div>
            )}
          </Card>

          <Card title="کلیدهای درگاه‌ها" icon="shield">
            <p className="text-[11px] text-muted mb-4 leading-6">
              کلیدها به‌صورت ماسک‌شده نمایش داده می‌شوند و هرگز به مرورگر ارسال نمی‌شوند. برای تغییر، مقدار جدید را وارد کنید؛ خالی گذاشتن یعنی بدون تغییر.
            </p>
            <div className="space-y-3">
              {GATEWAYS.filter((g) => g.keyField).map((g) => (
                <Field key={g.keyField} label={g.keyLabel}>
                  <input
                    className="input tabular" dir="ltr" type="text" autoComplete="off"
                    value={f[g.keyField]}
                    onChange={(e) => set({ [g.keyField]: e.target.value })}
                    placeholder={hasKeys[g.id] ? 'برای تغییر، کلید جدید را وارد کنید' : 'هنوز ثبت نشده است'}
                  />
                </Field>
              ))}
            </div>
            <div className="rounded-theme p-3 mt-4 text-[11px] leading-6" style={{ background: 'var(--surface-2)' }}>
              <b className="block mb-1">تأیید تراکنش سمت سرور</b>
              <span className="text-muted">
                هر پرداخت با امضای HMAC-SHA256 روی «شناسه سفارش + مبلغ + درگاه» مهر می‌شود و مبلغ فقط از دیتابیس خوانده می‌شود.
                تأیید نهایی سرور-به-سرور با درگاه انجام می‌گیرد و تلاش دوباره (replay) با به‌روزرسانی شرطی مسدود می‌شود.
              </span>
            </div>
          </Card>
        </div>
      )}

      {tab === 'contact' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="راه‌های ارتباطی" icon="phone">
            <div className="space-y-3">
              <Field label="شماره تماس"><input className="input" value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
              <Field label="ایمیل پشتیبانی"><input className="input tabular" dir="ltr" value={f.email} onChange={(e) => set({ email: e.target.value })} /></Field>
              <Field label="نشانی"><textarea className="input min-h-[70px] leading-7" value={f.address} onChange={(e) => set({ address: e.target.value })} /></Field>
            </div>
          </Card>
          <Card title="شبکه‌های اجتماعی" icon="instagram">
            <div className="space-y-3">
              <Field label="اینستاگرام"><input className="input tabular" dir="ltr" value={f.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="https://instagram.com/…" /></Field>
              <Field label="تلگرام"><input className="input tabular" dir="ltr" value={f.telegram} onChange={(e) => set({ telegram: e.target.value })} placeholder="https://t.me/…" /></Field>
              <Field label="واتساپ"><input className="input tabular" dir="ltr" value={f.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="https://wa.me/…" /></Field>
            </div>
          </Card>
        </div>
      )}

      {tab === 'policies' && (
        <div className="space-y-4">
          <Card title="معرفی فروشگاه" icon="book">
            <textarea className="input min-h-[90px] leading-7" value={f.description} onChange={(e) => set({ description: e.target.value })} />
            <p className="text-[10px] text-muted mt-1.5">این متن در متادیتای سئو و صفحه «درباره ما» استفاده می‌شود.</p>
          </Card>
          <Card title="شرایط ارسال" icon="truck">
            <textarea className="input min-h-[90px] leading-7" value={f.shippingPolicy} onChange={(e) => set({ shippingPolicy: e.target.value })} />
          </Card>
          <Card title="شرایط بازگشت کالا" icon="refresh">
            <textarea className="input min-h-[90px] leading-7" value={f.returnPolicy} onChange={(e) => set({ returnPolicy: e.target.value })} />
          </Card>
        </div>
      )}

      {tab === 'system' && (
        <div className="space-y-4">
          <Card title="حالت تعمیر و نگهداری" icon="alert">
            <Switch
              checked={f.maintenanceMode}
              onChange={(v) => set({ maintenanceMode: v })}
              label="فعال کردن حالت تعمیر"
              hint="سایت برای بازدیدکنندگان بسته می‌شود اما پنل مدیریت همچنان در دسترس شماست."
            />
            {f.maintenanceMode && (
              <div className="mt-3">
                <label className="label">پیام نمایش‌داده‌شده به کاربران</label>
                <textarea className="input min-h-[70px] leading-7" value={f.maintenanceMessage} onChange={(e) => set({ maintenanceMessage: e.target.value })} />
              </div>
            )}
          </Card>

          <Card title="دسترسی به پنل مدیریت" icon="shield">
            <div className="rounded-theme p-4 text-[12px] leading-7" style={{ background: 'var(--surface-2)' }}>
              <p className="mb-2">
                پنل مدیریت <b>هیچ لینک یا دکمه‌ای در سایت ندارد</b> و فقط از طریق آدرس مستقیم زیر قابل دسترسی است:
              </p>
              <code className="block px-3 py-2 rounded-theme tabular text-xs" dir="ltr" style={{ background: 'var(--bg)', color: 'var(--primary)' }}>
                /admin/panel
              </code>
              <ul className="mt-3 space-y-1.5 text-muted text-[11px]">
                <li>• صفحه پنل با هدر <span className="tabular" dir="ltr">X-Robots-Tag: noindex</span> از ایندکس موتورهای جستجو خارج است.</li>
                <li>• ورود ناموفق پیاپی باعث قفل موقت حساب (۱۵ دقیقه پس از ۵ تلاش) می‌شود.</li>
                <li>• همه نشست‌ها با کوکی httpOnly و توکن CSRF محافظت می‌شوند.</li>
                <li>• تمام عملیات حساس در «حسابرسی و امنیت» ثبت می‌شود.</li>
              </ul>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function Card({ title, icon, children }) {
  const I = Icons[icon] || Icons.settings;
  return (
    <div className="card p-4 md:p-5">
      <h3 className="text-sm font-extrabold mb-4 flex items-center gap-2">
        <I size={16} style={{ color: 'var(--primary)' }} /> {title}
      </h3>
      {children}
    </div>
  );
}

const Field = ({ label, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
  </div>
);
