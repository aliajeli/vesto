'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, useToast } from '@/components/Providers';
import { Icons, Spinner } from '@/components/ui';

/**
 * ورود اختصاصی مدیر.
 * این صفحه هیچ لینکی در سایت ندارد و فقط با دانستن آدرس مستقیم قابل دسترسی است.
 */
export default function AdminLogin({ storeName }) {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { identifier: form.identifier.trim(), password: form.password },
      });
      if (res.user?.role !== 'ADMIN') {
        push('این حساب دسترسی مدیریت ندارد.', 'error');
        await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        setBusy(false);
        return;
      }
      push('خوش آمدید، مدیر گرامی.', 'success');
      // بارگذاری کامل تا لایه‌ی سرور با نشست جدید دوباره ارزیابی شود
      window.location.replace('/admin/panel');
    } catch (err) {
      push(err.message, 'error');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4" style={{ background: 'var(--bg-soft)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-theme grid place-items-center mx-auto mb-3" style={{ background: 'var(--primary)', color: 'var(--primary-contrast)' }}>
            <Icons.shield size={26} />
          </div>
          <h1 className="text-lg font-extrabold">ورود به پنل مدیریت</h1>
          <p className="text-xs text-muted mt-1.5">{storeName} — ناحیه محافظت‌شده</p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4 shadow-theme">
          <div>
            <label className="label">ایمیل یا موبایل مدیر</label>
            <input
              className="input"
              dir="ltr"
              autoComplete="username"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">رمز عبور</label>
            <div className="relative">
              <input
                className="input pl-11"
                type={showPw ? 'text' : 'password'}
                dir="ltr"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label="نمایش رمز">
                <Icons.eye size={17} />
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-lg w-full" disabled={busy}>
            {busy ? <Spinner size={17} /> : <Icons.shield size={17} />}
            ورود امن
          </button>
        </form>

        <div className="card p-4 mt-4 text-[11px] leading-6 text-muted">
          <p className="font-extrabold text-ink mb-1 flex items-center gap-1.5">
            <Icons.book size={13} /> حساب مدیر پیش‌فرض
          </p>
          <p dir="ltr" className="tabular">admin@vesto.ir / Vesto@2024</p>
          <p className="mt-1.5">پس از اولین ورود، حتماً رمز عبور را از بخش تنظیمات تغییر دهید.</p>
        </div>

        <p className="text-[10px] text-center text-muted mt-4 leading-5">
          <Icons.alert size={11} className="inline ml-1" />
          تمام تلاش‌های ورود ثبت می‌شود. پس از ۵ تلاش ناموفق حساب به‌مدت ۱۵ دقیقه قفل می‌شود.
        </p>
      </div>
    </div>
  );
}
