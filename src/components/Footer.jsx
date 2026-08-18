'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSettings, apiFetch, useToast } from './Providers';
import { Icons as I } from './ui';

export default function Footer({ categories = [] }) {
  const s = useSettings();
  const { push } = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const roots = categories.filter((c) => !c.parentId).slice(0, 6);

  const subscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      await apiFetch('/api/newsletter', { method: 'POST', body: { email: email.trim() } });
      push('ایمیل شما ثبت شد. از تخفیف‌های ویژه باخبر می‌شوید.', 'success');
      setEmail('');
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const trust = [
    { icon: I.truck, title: 'ارسال سریع', text: 'تحویل ۱ تا ۴ روز کاری' },
    { icon: I.refresh, title: '۷ روز بازگشت', text: 'ضمانت بازگشت وجه' },
    { icon: I.shield, title: 'پرداخت امن', text: 'درگاه‌های معتبر بانکی' },
    { icon: I.check, title: 'اصالت کالا', text: 'ضمانت اورجینال بودن' },
  ];

  return (
    <footer className="mt-16 no-print" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
      {/* نوار اعتماد */}
      <div className="container-app py-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {trust.map((t) => (
          <div key={t.title} className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-theme grid place-items-center shrink-0"
              style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
            >
              <t.icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold">{t.title}</p>
              <p className="text-[11px] text-muted truncate">{t.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="container-app py-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-2xl font-extrabold tracking-[0.18em] mb-3" style={{ color: 'var(--primary)' }}>
              {s.logoText || 'VESTO'}
            </p>
            <p className="text-sm text-muted leading-7">{s.footerAbout}</p>
            <div className="flex gap-2 mt-4">
              {s.instagram && (
                <a href={s.instagram} target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام" className="w-9 h-9 rounded-theme grid place-items-center border border-line hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                  <I.instagram size={17} />
                </a>
              )}
              {s.phone && (
                <a href={`tel:${s.phone}`} aria-label="تماس" className="w-9 h-9 rounded-theme grid place-items-center border border-line hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                  <I.phone size={17} />
                </a>
              )}
              {s.email && (
                <a href={`mailto:${s.email}`} aria-label="ایمیل" className="w-9 h-9 rounded-theme grid place-items-center border border-line hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                  <I.mail size={17} />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-extrabold text-sm mb-3">دسترسی سریع</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/shop" className="hover:text-ink transition-colors">همه محصولات</Link></li>
              <li><Link href="/shop?sale=1" className="hover:text-ink transition-colors">تخفیف‌ها</Link></li>
              <li><Link href="/shop?sort=newest" className="hover:text-ink transition-colors">جدیدترین‌ها</Link></li>
              <li><Link href="/cart" className="hover:text-ink transition-colors">سبد خرید</Link></li>
              <li><Link href="/track" className="hover:text-ink transition-colors">پیگیری سفارش</Link></li>
              <li><Link href="/contact" className="hover:text-ink transition-colors">تماس با ما</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-sm mb-3">دسته‌بندی‌ها</h4>
            <ul className="space-y-2 text-sm text-muted">
              {roots.map((c) => (
                <li key={c.id}>
                  <Link href={`/shop?category=${c.slug}`} className="hover:text-ink transition-colors">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-sm mb-3">خبرنامه وستو</h4>
            <p className="text-xs text-muted leading-6 mb-3">
              ایمیل خود را وارد کنید تا از کالکشن‌های جدید و کدهای تخفیف باخبر شوید.
            </p>
            <form onSubmit={subscribe} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ایمیل شما"
                className="input flex-1"
                dir="ltr"
              />
              <button className="btn btn-primary shrink-0" disabled={busy}>
                {busy ? '...' : 'عضویت'}
              </button>
            </form>
            <div className="mt-4 space-y-1.5 text-xs text-muted">
              {s.address && <p className="flex items-start gap-2"><I.pin size={14} className="mt-0.5 shrink-0" />{s.address}</p>}
              {s.phone && <p className="flex items-center gap-2 tabular" dir="rtl"><I.phone size={14} />{s.phone}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-app py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted">
          <p>© {new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(new Date())} — تمامی حقوق برای {s.storeNameFa || s.storeName} محفوظ است.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5"><I.shield size={14} /> پرداخت امن SSL</span>
            <div className="flex gap-2 items-center opacity-80">
              <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>زیبال</span>
              <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>زرین‌پال</span>
              <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>پی‌پینگ</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
