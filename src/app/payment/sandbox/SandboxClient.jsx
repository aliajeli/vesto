'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icons, money, toFa, Spinner } from '@/components/ui';

export default function SandboxClient() {
  const sp = useSearchParams();
  const pid = sp.get('pid');
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [seconds, setSeconds] = useState(600);

  useEffect(() => {
    if (!pid) { setLoading(false); return; }
    fetch(`/api/payment/status?pid=${encodeURIComponent(pid)}`)
      .then((r) => r.json())
      .then((d) => setPayment(d.payment || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pid]);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const go = (approved) => {
    setBusy(approved ? 'approve' : 'cancel');
    window.location.href = `/api/payment/verify?pid=${encodeURIComponent(pid)}&approved=${approved ? 1 : 0}`;
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Spinner size={30} />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="card p-8 text-center max-w-sm">
          <Icons.alert size={40} className="mx-auto mb-3" style={{ color: 'var(--danger)' }} />
          <h1 className="font-extrabold mb-2">تراکنش یافت نشد</h1>
          <p className="text-sm text-muted mb-4">شناسه پرداخت نامعتبر است یا منقضی شده.</p>
          <a href="/" className="btn btn-primary">بازگشت به فروشگاه</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center p-4" style={{ background: 'var(--bg-soft)' }}>
      <div className="w-full max-w-md">
        {/* هدر شبه‌بانکی */}
        <div className="card overflow-hidden shadow-theme">
          <div className="p-5 text-center" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
            <div className="inline-flex items-center gap-2 mb-1">
              <Icons.shield size={20} style={{ color: 'var(--primary)' }} />
              <span className="font-extrabold">درگاه پرداخت آزمایشی وستو</span>
            </div>
            <p className="text-[11px] text-muted">این یک شبیه‌ساز است — هیچ تراکنش واقعی انجام نمی‌شود.</p>
          </div>

          <div className="p-5 space-y-4">
            <div className="rounded-theme p-4 space-y-2.5 text-sm" style={{ background: 'var(--bg-soft)' }}>
              <Row label="پذیرنده" value="فروشگاه وستو" />
              <Row label="شماره سفارش" value={payment.orderNumber} mono />
              <Row label="شناسه پرداخت" value={payment.id.slice(0, 14) + '…'} mono />
              <div className="border-t border-line pt-2.5 flex items-center justify-between">
                <span className="text-muted">مبلغ قابل پرداخت</span>
                <span className="text-lg font-extrabold tabular" style={{ color: 'var(--primary)' }}>
                  {money(payment.amount)}
                </span>
              </div>
            </div>

            {/* شبیه‌سازی فرم کارت */}
            <div className="space-y-2.5 opacity-70 pointer-events-none select-none">
              <div>
                <label className="label">شماره کارت</label>
                <input className="input tabular text-center tracking-[0.2em]" dir="ltr" defaultValue="6037-9911-2345-6789" readOnly />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="label">CVV2</label><input className="input text-center" dir="ltr" defaultValue="***" readOnly /></div>
                <div><label className="label">ماه</label><input className="input text-center" dir="ltr" defaultValue="09" readOnly /></div>
                <div><label className="label">سال</label><input className="input text-center" dir="ltr" defaultValue="07" readOnly /></div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted">
              <Icons.clock size={14} />
              <span className="tabular">زمان باقی‌مانده: {toFa(`${mm}:${ss}`)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => go(false)} disabled={!!busy} className="btn btn-ghost">
                {busy === 'cancel' ? <Spinner size={15} /> : <Icons.close size={16} />}
                انصراف
              </button>
              <button onClick={() => go(true)} disabled={!!busy} className="btn btn-primary">
                {busy === 'approve' ? <Spinner size={15} /> : <Icons.check size={16} />}
                پرداخت موفق
              </button>
            </div>

            <p className="text-[11px] text-muted text-center leading-6">
              پس از اتصال درگاه واقعی (زیبال / زرین‌پال / پی‌پینگ) از پنل مدیریت،
              کاربران مستقیماً به صفحه‌ی بانک هدایت می‌شوند.
            </p>
          </div>
        </div>
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
