'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast, apiFetch, useSettings } from './Providers';
import { Icons, Spinner } from './ui';

export default function AuthForm({ mode = 'login' }) {
  const isLogin = mode === 'login';
  const router = useRouter();
  const sp = useSearchParams();
  const { push } = useToast();
  const s = useSettings();
  const next = sp.get('next') || '/account';

  const [form, setForm] = useState({ identifier: '', password: '', name: '', email: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});

  const pwScore = (pw) => {
    let n = 0;
    if (pw.length >= 8) n++;
    if (pw.length >= 12) n++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) n++;
    if (/\d/.test(pw)) n++;
    if (/[^\w\s]/.test(pw)) n++;
    return Math.min(4, n);
  };
  const score = pwScore(form.password);
  const scoreLabels = ['خیلی ضعیف', 'ضعیف', 'متوسط', 'خوب', 'عالی'];
  const scoreColors = ['var(--danger)', 'var(--danger)', 'var(--warning)', 'var(--success)', 'var(--success)'];

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      if (isLogin) {
        await apiFetch('/api/auth/login', {
          method: 'POST',
          body: { identifier: form.identifier.trim(), password: form.password },
        });
        push('خوش آمدید!', 'success');
      } else {
        if (!form.email && !form.phone) {
          setErrors({ email: 'ایمیل یا شماره موبایل الزامی است.' });
          setBusy(false);
          return;
        }
        await apiFetch('/api/auth/register', {
          method: 'POST',
          body: {
            name: form.name.trim(),
            email: form.email.trim() || '',
            phone: form.phone.trim() || '',
            password: form.password,
          },
        });
        push('حساب شما ساخته شد. خوش آمدید!', 'success');
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      push(err.message, 'error');
      setBusy(false);
    }
  };

  return (
    <div className="container-app py-10 md:py-16">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-7">
          <p className="text-2xl font-extrabold tracking-[0.18em] mb-2" style={{ color: 'var(--primary)' }}>
            {s.logoText || 'VESTO'}
          </p>
          <h1 className="text-xl font-extrabold">{isLogin ? 'ورود به حساب کاربری' : 'ساخت حساب جدید'}</h1>
          <p className="text-xs text-muted mt-1.5">
            {isLogin ? 'برای پیگیری سفارش‌ها و خرید سریع‌تر وارد شوید.' : 'در چند ثانیه عضو خانواده وستو شوید.'}
          </p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
          {isLogin ? (
            <div>
              <label className="label">ایمیل یا شماره موبایل</label>
              <input
                className="input"
                autoComplete="username"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                placeholder="admin@vesto.ir یا 09121234567"
                dir="ltr"
                required
              />
            </div>
          ) : (
            <>
              <div>
                <label className="label">نام و نام خانوادگی</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="سارا محمدی" required minLength={2} />
              </div>
              <div>
                <label className="label">شماره موبایل</label>
                <input className="input tabular" dir="ltr" inputMode="numeric" maxLength={11} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} placeholder="09121234567" />
              </div>
              <div>
                <label className="label">ایمیل (اختیاری)</label>
                <input className="input" type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                {errors.email && <p className="text-[11px] mt-1.5 font-bold" style={{ color: 'var(--danger)' }}>{errors.email}</p>}
              </div>
            </>
          )}

          <div>
            <label className="label">رمز عبور</label>
            <div className="relative">
              <input
                className="input pl-11"
                type={showPw ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={isLogin ? 1 : 8}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                aria-label={showPw ? 'مخفی کردن' : 'نمایش'}
              >
                <Icons.eye size={17} />
              </button>
            </div>

            {!isLogin && form.password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="h-1 flex-1 rounded-full transition-colors"
                      style={{ background: i < score ? scoreColors[score] : 'var(--border)' }}
                    />
                  ))}
                </div>
                <p className="text-[10px] mt-1.5 font-bold" style={{ color: scoreColors[score] }}>
                  قدرت رمز: {scoreLabels[score]} — حداقل ۸ کاراکتر شامل حرف و رقم
                </p>
              </div>
            )}
          </div>

          <button className="btn btn-primary btn-lg w-full" disabled={busy}>
            {busy ? <Spinner size={17} /> : <Icons.user size={17} />}
            {isLogin ? 'ورود' : 'ثبت‌نام'}
          </button>

          <p className="text-xs text-center text-muted pt-1">
            {isLogin ? 'حساب کاربری ندارید؟' : 'قبلاً ثبت‌نام کرده‌اید؟'}{' '}
            <Link href={isLogin ? '/register' : '/login'} className="font-extrabold" style={{ color: 'var(--primary)' }}>
              {isLogin ? 'ثبت‌نام کنید' : 'وارد شوید'}
            </Link>
          </p>
        </form>

        {isLogin && (
          <div className="card p-4 mt-4 text-[11px] leading-6 text-muted">
            <p className="font-extrabold text-ink mb-1.5 flex items-center gap-1.5">
              <Icons.book size={14} /> حساب‌های نمونه برای تست
            </p>
            <p>مدیر: <b className="text-ink" dir="ltr">admin@vesto.ir</b> / <b className="text-ink" dir="ltr">Vesto@2024</b></p>
            <p>مشتری: <b className="text-ink" dir="ltr">user1@example.com</b> / <b className="text-ink" dir="ltr">Test@1234</b></p>
          </div>
        )}

        <p className="text-[11px] text-center text-muted mt-5 leading-6">
          <Icons.shield size={12} className="inline ml-1" />
          رمز عبور شما با الگوریتم bcrypt رمزنگاری می‌شود و پس از ۵ تلاش ناموفق، حساب موقتاً قفل می‌گردد.
        </p>
      </div>
    </div>
  );
}
